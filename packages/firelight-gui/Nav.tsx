import lunr, { type Index as LunrIndex } from 'lunr';

import { useDebounce } from 'use-debounce';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { SearchField, ActionGroup, ListView, Item, Text } from '@adobe/react-spectrum';
import Delete from '@spectrum-icons/workflow/Delete';
//import BookmarkIcon from '@spectrum-icons/workflow/BookmarkSmallOutline';
//import BookmarkIconActive from '@spectrum-icons/workflow/BookmarkSmall';
import { type SearchQuery } from './model.mjs';
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
      const tokens = lunr.tokenizer(debouncedQuery.replace(/:/g, ' '));
      //const queryTokenized = lunr.tokenizer(debouncedQuery);
      console.debug("Search: tokens", tokens);
      //console.debug("Search: Lunr argument", queryTokenized.map(t => `${t}`).join(' '));

      try {

        const exact =
          (index.query(query => {
            query.term(debouncedQuery, {
              presence: lunr.Query.presence.REQUIRED,
              wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING,
            });
          }) ?? []).
          slice(0, MAX_SEARCH_RESULT_COUNT);

        const full = exact.length < 1 || showMore
          ? (index.query(query => {
              query.term(tokens, {
                presence: lunr.Query.presence.REQUIRED,
              });
            }) ?? []).
            slice(0, MAX_SEARCH_RESULT_COUNT)
          : [];

        const partial = (exact.length < 1 && full.length < 1) || showMore
          ? (index.query(query => {
              query.term(tokens, {
                presence: lunr.Query.presence.OPTIONAL,
                wildcard: lunr.Query.wildcard.LEADING | lunr.Query.wildcard.TRAILING,
              });
            }) ?? []).
            slice(0, MAX_SEARCH_RESULT_COUNT)
          : [];

        return [{ exact, full, partial }, null];

      } catch (e) {
        return [{ exact: [], full: [], partial: [] }, `${(e as any).message}`];
      }

    } else {
      return [{ exact: [], full: [], partial: [] }, null];
    }
  }, [index, debouncedQuery, showMore]);

  const results = useMemo(() => {
    const allResults = (Object.entries(matches).
    flatMap(([matchType, results]) => {
      console.debug(matchType, results.length);
      return results.map(res => ({ [res.ref]: res }));
    }) ?? []).reduce((prev, curr) => ({ ...prev, ...curr }), {});

    return Object.values(allResults).
    map(res => ({ ...res, id: res.ref, name: res.ref }));
  }, [matches]);

  useEffect(() => {
    setShowMore(false);
  }, [debouncedQuery]);

  const renderItem = useCallback((result: { ref: string, score: number }) => {
    const title = getPlainTitle(result.ref);
    return <Item
        href={locateResource(result.ref)}
        key={result.ref}
        textValue={title}>
      <Text>{title} </Text>
      <Text slot="description">
        {getPlainTitle(getContainingPageURI(result.ref))}
      </Text>
    </Item>;
  }, [showMore, getPlainTitle, getContainingPageURI]);

  const showMoreButton =
    (matches.exact.length > 0 || matches.full.length > 0)
      ? <a onClick={() => setShowMore(!showMore)}>
          ({showMore ? 'Show fewer' : 'Check for more matches'})
        </a>
      : null;

  return <>
    <ListView
        flex={1}
        items={results}
        selectedKeys={new Set(selected ? [selected] : [])}
        onSelectionChange={(selectedKeys) => {
          const key = selectedKeys !== 'all'
            ? `${selectedKeys.keys().next().value}`
            : undefined;
          if (key) {
            onSelect(key);
          }
        }}
        selectionMode="single"
        selectionStyle="highlight"
        aria-label="Matching resources found"
        renderEmptyState={() => <></>}>
      {renderItem}
    </ListView>
    <SearchField
      width="100%"
      autoFocus
      alignSelf="stretch"
      onChange={onEditQueryText ?? (() => {})}
      isReadOnly={!onEditQueryText}
      label="Search resources"
      value={query.text}
      errorMessage={error}
      UNSAFE_className={classNames.navStickyHeader}
      validationState={error ? 'invalid' : 'valid'}
      description={results.length > 0
        ? <>
            {results.length >= MAX_SEARCH_RESULT_COUNT ? 'At least ' : ''}
            {results.length} resources matched. {showMoreButton}
          </>
        : query.text.trim() === ''
          ? "Please enter a search query."
          : "No results to show."}
    />
  </>;
}
