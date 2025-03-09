import React, { useCallback, useMemo, useState } from 'react';
import { TreeView, TreeViewItem } from '@react-spectrum/tree';
import { Text, type Selection } from '@adobe/react-spectrum';
import { useDebouncedCallback } from 'use-debounce';


interface IRecursiveNavigationEntry {
  readonly name: string;
  readonly id: string;
  readonly path: string;
  readonly childItems: IRecursiveNavigationEntry[];
}


export const Hierarchy: React.FC<{
  hierarchy: IRecursiveNavigationEntry[],
  expanded: Set<string>;
  onExpand?: (uri: Set<string>) => void;
  selected: Set<string>;
  onSelect: (uri: string) => void;
}> = React.memo(function ({ hierarchy, selected, onSelect, expanded, onExpand }) {

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
        id={item.id}
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
      onSelectionChange={(selectedKeys: Selection) => {
        selectedKeys !== 'all'
          ? onSelect(selectedKeys.keys().next().value)
          : void 0}}
      onExpandedChange={useMemo(() => (onExpand
        ? (keys => onExpand(new Set(Array.from(keys).filter(k => typeof k === 'string'))))
        : undefined), [onExpand])}
      aria-label="Resource hierarchy">
    {itemView}
  </TreeView>
});


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
