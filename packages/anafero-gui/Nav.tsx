import lunr, { type Index as LunrIndex } from 'lunr';

import { useDebounce } from 'use-debounce';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { SearchField, ActionGroup, ListView, Item, Link, Text } from '@adobe/react-spectrum';
import Delete from '@spectrum-icons/workflow/Delete';
//import BookmarkIcon from '@spectrum-icons/workflow/BookmarkSmallOutline';
//import BookmarkIconActive from '@spectrum-icons/workflow/BookmarkSmall';
import { type SearchQuery } from './model.mjs';
import { preprocessStringForIndexing } from 'anafero/index.mjs';
import classNames from './style.module.css';


export const Bookmarks: React.FC<{
  bookmarkedResources: Set<string>;
  onNavigate?: (uri: string) => void;
  onRemoveBookmark?: (uri: string) => void;
  getPlainTitle: (uri: string) => string;
  locateResource: (uri: string) => string;
}> = function ({ bookmarkedResources, locateResource, getPlainTitle, onRemoveBookmark }) {
  return <ListView
      flexGrow={1}
      UNSAFE_className={classNames.navListView}
      items={Array.from(bookmarkedResources).map(res => ({ id: res }))}
      renderEmptyState={() => <>There are no bookmarks.</>}>
    {(res =>
      <Item
          key={res.id}
          textValue="A bookmarked resource"
          href={locateResource(res.id)}>
        <Text>{getPlainTitle(res.id)}</Text>
        {onRemoveBookmark
          ? <ActionGroup onAction={() => onRemoveBookmark?.(res.id)}>
              <Item key="delete" aria-label="Delete bookmark" textValue="Delete bookmark">
                {/* @ts-expect-error */}
                <Delete />
              </Item>
            </ActionGroup>
          : null}
      </Item>
    )}
  </ListView>;
};


const MAX_SEARCH_RESULT_COUNT = 100;

function resultRefToResourceURI(ref: string): string {
  return ref;
}

export const Search: React.FC<{
  index: LunrIndex;
  query: SearchQuery;
  selected?: string;
  onSelect: (resID: string) => void;
  onEditQueryText?: (newText: string) => void;
  getPlainTitle: (resID: string) => string;
  locateResource: (resID: string) => string;
  getContainingPageURI: (url: string) => string;
}> = function ({ index, selected, onSelect, query, getPlainTitle, locateResource, getContainingPageURI, onEditQueryText }) {
  const [debouncedQuery] = useDebounce(query.text, 200);

  const [showMore, setShowMore] = useState(false);

  const [matches, error] = useMemo(() => {
    if (index && debouncedQuery.trim() !== '') {
      const normalizedQuery = preprocessStringForIndexing(
        debouncedQuery.
          replace(/:/g, " ").
          // TODO: Actually wildcards can happen in some positions,
          // but when the query is mostly a wildcard it can be too low.
          replace(/\*/g, " "));
      const tokens = lunr.tokenizer(normalizedQuery);
      //const queryTokenized = lunr.tokenizer(debouncedQuery);
      console.debug("Search: tokens", tokens);
      //console.debug("Search: Lunr argument", queryTokenized.map(t => `${t}`).join(' '));

      try {

        let exact: LunrIndex.Result[];
        try {
          exact =
            (index.query(query => {
              for (const t of tokens) {
                query.term(t, {
                  presence: lunr.Query.presence.REQUIRED,
                });
              }
            }) ?? []).
            slice(0, MAX_SEARCH_RESULT_COUNT);
        } catch (e) {
          exact = [];
          console.error("Failed exact search", e);
        }

        const full = exact.length < 1 || showMore
          ? (index.query(query => {
              for (const t of tokens) {
                query.term(t, {
                  presence: lunr.Query.presence.REQUIRED,
                });
              }
            }) ?? []).
            slice(0, MAX_SEARCH_RESULT_COUNT)
          : [];

        const partial = (exact.length < 1 && full.length < 1) || showMore
          ? (index.query(query => {
              query.term(tokens, {
                presence: lunr.Query.presence.OPTIONAL,
              });
            }) ?? []).
            slice(0, MAX_SEARCH_RESULT_COUNT)
          : [];

        return [{ exact, full, partial }, null];

      } catch (e) {
        console.error(e);
        return [{ exact: [], full: [], partial: [] }, "Sorry, something went wrong"];
      }

    } else {
      return [{ exact: [], full: [], partial: [] }, null];
    }
  }, [index, debouncedQuery, showMore]);

  /** Results keyed by resource ID (ref). */
  const results = useMemo(() => {
    return (Object.entries(matches).
    flatMap(([matchType, results]) => {
      console.debug(matchType, results.length);
      return results.map(function processResult(res) {
        return {
          [res.ref]: res,
        };
      });
    }) ?? []).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }, [matches]);

  const resultMetadata = useMemo(() => {
    return (Object.keys(results).map(ref => {
      const resourceURI = resultRefToResourceURI(ref);

      const title = getPlainTitle(resourceURI);

      /** Resource path. */
      let path: string | undefined;
      try {
        path = locateResource(resourceURI);
      } catch (e) {
        console.error("Failed to get resource path for result", ref);
        path = undefined;
      }

      /** URI of the resource represented by containing page. */
      let pageResource: { uri: string, title: string } | undefined;
      try {
        const pageURI = getContainingPageURI(resourceURI);
        const title = getPlainTitle(pageURI);
        pageResource = { uri: pageURI, title };
      } catch (e) {
        console.error("Failed to get containing page resource URI for", ref);
        pageResource = undefined;
      }

      return { [ref]: { uri: resourceURI, path, title, pageResource } };

    }) ?? []).reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }, [results, getPlainTitle, locateResource, getContainingPageURI]);

  /** Results as an array for list view. */
  const resultArray = useMemo(() => {
    return Object.values(results).
    map(res => ({ ...res, id: res.ref, name: res.ref }));
  }, [results]);

  const selectedKeys = useMemo(() => {
    return new Set(selected ? [selected] : []);
  }, [selected]);

  const disabledKeys = useMemo(() => {
    return new Set(resultArray.
      filter(result => resultMetadata[result.ref]?.path === undefined).
      map(r => r.ref));
  }, [resultArray, resultMetadata]);

  useEffect(() => {
    setShowMore(false);
  }, [debouncedQuery]);

  const renderItem = useCallback((result: { ref: string, score: number, matchData: any }) => {
    const meta = resultMetadata[result.ref];
    const title = meta?.title ?? "Untitled";
    return <Item
        key={result.ref}
        textValue={title}>
      <Text UNSAFE_className={classNames.navListViewItemWithLink}>
        <Link href={meta?.path ?? 'javascript: void 0;'}>
          {title}
        </Link>
      </Text>
      <Text slot='description'>
        {meta?.pageResource?.title ?? ""}
      </Text>
    </Item>;
  }, [showMore, getPlainTitle, resultMetadata]);

  const showMoreButton =
    (matches.exact.length > 0 || matches.full.length > 0)
      ? <a onClick={() => setShowMore(!showMore)}>
          ({showMore ? "Show fewer" : "Check for more matches"})
        </a>
      : null;

  return <>
    <ListView
        flex={1}
        items={resultArray}
        UNSAFE_className={classNames.navListView}
        selectedKeys={selectedKeys}
        disabledKeys={disabledKeys}
        onSelectionChange={(selectedKeys) => {
          const key = selectedKeys !== 'all'
            ? selectedKeys.keys().next().value
            : undefined;
          if (key) {
            onSelect(`${key}`);
          }
        }}
        selectionMode='single'
        selectionStyle='highlight'
        aria-label="Matching resources found"
        renderEmptyState={() => <></>}>
      {renderItem}
    </ListView>
    <SearchField
      width='100%'
      autoFocus
      alignSelf='stretch'
      onChange={onEditQueryText ?? (() => {})}
      isReadOnly={!onEditQueryText}
      label="Search resources"
      value={query.text}
      errorMessage={error}
      UNSAFE_className={classNames.navStickyHeader}
      validationState={error ? 'invalid' : 'valid'}
      description={resultArray.length > 0
        ? <>
            {resultArray.length >= MAX_SEARCH_RESULT_COUNT ? "At least " : ""}
            {resultArray.length} resources matched. {showMoreButton}
          </>
        : query.text.trim() === ''
          ? "Please enter a search query."
          : "No results to show."}
    />
  </>;
}
