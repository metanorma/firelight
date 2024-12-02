import { type Index as LunrIndex } from 'lunr';

// TODO: Check whether this is necessary to do on the client
import lunr from 'lunr';

import enableLunrStemmer from 'lunr-languages/lunr.stemmer.support';
import enableTinyLunrSegmenter from 'lunr-languages/tinyseg';
import enableLunrFr from 'lunr-languages/lunr.fr';
import enableLunrJa from 'lunr-languages/lunr.ja';
import { enableNewLunrJaTokenizer } from 'anafero/index.mjs';

enableLunrStemmer(lunr);
enableTinyLunrSegmenter(lunr);
enableLunrFr(lunr);
enableLunrJa(lunr);
enableNewLunrJaTokenizer(lunr);

import { useDebounce, useDebouncedCallback } from 'use-debounce';
import React, { useCallback, useMemo, useState } from 'react';
import { SearchField, ActionGroup, ListView, Item, Text } from '@adobe/react-spectrum';
import { TreeView, TreeViewItem } from '@react-spectrum/tree';
import Delete from '@spectrum-icons/workflow/Delete';
//import BookmarkIcon from '@spectrum-icons/workflow/BookmarkSmallOutline';
//import BookmarkIconActive from '@spectrum-icons/workflow/BookmarkSmall';
import { SearchQuery } from './model.mjs';
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
      isQuiet
      items={Array.from(bookmarkedResources).map(res => ({ id: res }))}
      renderEmptyState={() => <>There are no bookmarks.</>}>
    {(res =>
      <Item
          key={res.id}
          textValue="A bookmarked resource"
          href={`/${locateResource(res.id)}`}>
        <Text>{getPlainTitle(res.id)}</Text>
        {onRemoveBookmark
          ? <ActionGroup onAction={() => onRemoveBookmark?.(res.id)}>
              <Item key="delete" aria-label="Delete bookmark" textValue="Delete bookmark">
                <Delete />
              </Item>
            </ActionGroup>
          : null}
      </Item>
    )}
  </ListView>;
};


export const Search: React.FC<{
  index: LunrIndex;
  query: SearchQuery;
  onEditQueryText?: (newText: string) => void;
  getPlainTitle: (resID: string) => string;
  locateResource: (resID: string) => string;
}> = function ({ index, query, getPlainTitle, locateResource, onEditQueryText }) {
  const [debouncedQuery] = useDebounce(query.text, 200);
  const [results, error] = useMemo(() => {
    if (debouncedQuery.trim() !== '') {
      try {
        return [
          index?.
            search(debouncedQuery)?.
            map(res => ({ ...res, id: res.ref, name: res.ref })),
          null,
        ];
      } catch (e) {
        return [
          [],
          `${e.message}`,
        ];
      }
    } else {
      return [[], null];
    }
  }, [index, debouncedQuery]);
  return <>
    <SearchField
      isQuiet
      width="100%"
      alignSelf="stretch"
      onChange={onEditQueryText}
      isReadOnly={!onEditQueryText}
      value={query.text}
      errorMessage={error}
      UNSAFE_className={classNames.navStickyHeader}
      validationState={error ? 'invalid' : undefined}
      description={results.length > 0 ? `${results.length} total.` : undefined}
    />
    <ListView
        flex={1}
        items={results}
        isQuiet
        renderEmptyState={() => <>There is nothing to show.</>}>
      {({ ref }) =>
        <Item href={`/${locateResource(ref)}`} key={ref}>
          <Text>{getPlainTitle(ref)}</Text>
        </Item>}
    </ListView>
  </>;
}


export const Hierarchy: React.FC<{
  hierarchy: IRecursiveNavigationEntry[],
  expanded: Set<string>;
  onExpand?: (uri: Set<string>) => void;
  selected: Set<string>;
  onSelect: (uri: string) => void;
}> = function ({ hierarchy, selected, onSelect, expanded, onExpand }) {

  const [hasScrolled, setHasScrolled] = useState<string | null>(null);
  // const [isScrolling, setIsScrolling] = useState(false);

  const scrollToMe = useDebouncedCallback((id: string, el: Element) => {
    if (hasScrolled !== id) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setHasScrolled(id);
    }
  }, 200);

  const treeElRef = useCallback((treeRef: { UNSAFE_getDOMNode(): HTMLElement } | null) => {
    const sel = selected.values().next().value as string;
    if (sel) {
      const el = treeRef?.UNSAFE_getDOMNode()?.querySelector(`[data-resource-id="${sel}"]`);
      if (el) {
        scrollToMe(sel, el);
      }
    }
  }, [selected, hasScrolled]);

  //const selectedItemRef = useCallback((itemID: string, item: { UNSAFE_getDOMNode(): HTMLElement } | null) => {
  //  //const el = item?.UNSAFE_getDOMNode();
  //  //if (el && itemID !== hasScrolled && !isScrolling) {
  //  //  el.scrollIntoView({
  //  //    behavior: hasScrolled ? 'smooth' : 'instant',
  //  //    block: 'center',
  //  //  });
  //  //  setHasScrolled(itemID);
  //  //  setIsScrolling(true);
  //  //  setTimeout(() => setIsScrolling(false), 500);
  //  //}
  //}, [hasScrolled, setHasScrolled, isScrolling]);

  const itemView = useCallback((item: IRecursiveNavigationEntry) => {
    return <TreeViewItem
        key={item.id}
        href={`/${item.path}`}
        childItems={item.childItems}
        textValue={item.name}>

      <Text>
        {item.name}
      </Text>

      <div role="presentation" data-resource-id={item.id} />
    </TreeViewItem>
  }, []);

  return <TreeView
      flexGrow={1}
      items={hierarchy}
      selectedKeys={selected}
      disallowEmptySelection
      ref={treeElRef}
      selectionStyle="highlight"
      selectionMode="single"
      expandedKeys={expanded}
      onSelectionChange={selectedKeys => {
        selectedKeys !== 'all'
          ? onSelect(selectedKeys.keys().next().value)
          : void 0}}
      onExpandedChange={useMemo(() => (onExpand
        ? (keys => onExpand(new Set(Array.from(keys).filter(k => typeof k === 'string'))))
        : undefined), [onExpand])}
      aria-label="Resource hierarchy">
    {itemView}
  </TreeView>
}

/**
 * Converts a list of paths without leading or trailing slashes
 * to an hierarchy of objects.
 */
export function pathListToHierarchy(
  pathList: string[],
  getPathInfo: (path: string) => { id: string, name: string, path: string },
  root = true,
): IRecursiveNavigationEntry[] {
  const pathsOnThisLevel = root ? [''] : Array.from(
    // Deduplicate paths (foo/bar, foo/baz => just [foo])
    new Set(pathList.
      // Ignore paths with hash fragments
      filter(p => !p.includes('#')).
      // Get first components of each path
      map(p => p ? p.split('/')[0]! : p))
  );
  return pathsOnThisLevel.
  map((path) => ({
    ...(getPathInfo(path)),
    childItems: pathListToHierarchy(
      pathList.
        filter(p => (path === '' || p.startsWith(`${path}/`)) && p.length > path.length).
        map(p => path ? p.replace(`${path}/`, '') : p).
        filter(p => p !== ''),
      function pathInfoForSubpath(subpath) {
        return getPathInfo(path ? [path, subpath].join('/') : subpath);
      },
      false,
    ),
  }));
}

export function findMatchingItemParents(
  amongItems: IRecursiveNavigationEntry[],
  predicate: (item: IRecursiveNavigationEntry) => boolean,
  _parents: string[],
): string[] {
  const parents = _parents ?? [];
  return amongItems.flatMap(i => {
    const itemMatches = predicate(i);
    if (itemMatches) {
      return parents;
    } else {
      return findMatchingItemParents(i.childItems, predicate, [i.id, ...parents]);
    }
  });
}


export interface IRecursiveNavigationEntry {
  readonly name: string;
  readonly id: string;
  readonly path: string;
  readonly childItems: IRecursiveNavigationEntry[];
}
