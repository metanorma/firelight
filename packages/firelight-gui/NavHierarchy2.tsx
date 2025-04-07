import React, { useCallback, useMemo, useState } from 'react';
import { Link, ListView, ActionButton, Item, Text, type Selection } from '@adobe/react-spectrum';
import CollapsedIcon from '@spectrum-icons/workflow/ChevronLeft';
import ExpandedIcon from '@spectrum-icons/workflow/ChevronDown';
import { useDebouncedCallback } from 'use-debounce';
import { getAllParentPaths } from 'anafero/index.mjs';
import classNames from './style.module.css';


interface Item {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly level: number;
  readonly hasChildren: boolean;
}


export const Hierarchy: React.FC<{
  /** Map of page paths (no fragments) to resource URIs. */
  pageMap: Record<string, string>;

  getResourceTitle: (uri: string) => string;

  /** URIs of all expanded resources, implicitly or explicitly. */
  expanded: Set<string>;

  /** URIs of implicitly expanded resources. */
  implicitlyExpanded: Set<string>;

  onExpand?: (uri: Set<string>) => void;
  selected: Set<string>;
  onSelect: (uri: string) => void;
}> = React.memo(function ({ pageMap, getResourceTitle, selected, onSelect, implicitlyExpanded, expanded, onExpand }) {

  const allPaths = useMemo(() => Object.keys(pageMap), [pageMap]);
  const items: Item[] = useMemo(() => {
    return Object.entries(pageMap).
    // The logic of
    // “only show an item if *all* of its parents are expanded”
    // seems, at second approach, good enough for a tree-style view.
    filter(([path, ]) => {
      // TODO: Retrieving parent paths for each path could be optimized?
      const parentPaths = getAllParentPaths(path);
      const parentURIs = new Set(parentPaths.
        map(p => pageMap[p]).
        filter(p => p !== undefined));
      const shouldAppear = parentURIs.isSubsetOf(expanded);
      //console.debug("Checking if should appear", path, parentURI, expanded, isExpanded);
      return shouldAppear;
    }).
    map(([path, id]) => {
      const level = path === ''
        ? 0
        : ((path.match(/\//g) ?? []).length + 1);
      return {
        path,
        id,
        title: getResourceTitle(id),
        // Count slashes
        level,
        hasChildren: allPaths.find(p => p.startsWith(`${path}/`)) !== undefined,
      };
    });
  }, [expanded, allPaths, pageMap, getResourceTitle]);

  const [hasScrolled, setHasScrolled] = useState<string | null>(null);
  // const [isScrolling, setIsScrolling] = useState(false);

  const scrollToMe = useDebouncedCallback((id: string, el: Element) => {
    if (hasScrolled !== id) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setHasScrolled(id);
    }
  }, 200);

  const listElRef = useCallback((elRef: { UNSAFE_getDOMNode(): HTMLElement | null } | null) => {
    const sel = selected.values().next().value as string;
    if (sel) {
      const el = elRef?.UNSAFE_getDOMNode()?.querySelector(`[data-resource-id="${sel}"]`);
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

  const toggleExpanded = useCallback(function toggleExpanded(itemID: string) {
    if (expanded.has(itemID)) {
      onExpand?.(new Set([...expanded].filter(i => i !== itemID)));
    } else {
      onExpand?.(new Set([...expanded, itemID]));
    }
  }, [expanded, onExpand]);

  const itemView = useCallback((item: Item) => {
    const isExpanded = expanded.has(item.id);
    const isForceExpanded = implicitlyExpanded.has(item.id);
    return (
      <Item
	  key={item.id}
	  //hasChildItems={item.hasChildren}
	  textValue={item.title}>
	<Link
	    href={`/${item.path}`}
	    UNSAFE_className={classNames.navListViewItemLink}
	    UNSAFE_style={{ marginLeft: `${item.level * 1}em` }}>
	  {item.title}
	</Link>
	{item.hasChildren
	  ? <ActionButton
		isDisabled={isForceExpanded}
		onPress={() => toggleExpanded(item.id)}>
	      {/* @ts-expect-error */}
	      {isExpanded ? <ExpandedIcon /> : <CollapsedIcon />}
	    </ActionButton>
	  : null}

	<div role="presentation" data-resource-id={item.id} />
      </Item>
    );
  }, [implicitlyExpanded, expanded, toggleExpanded, selected]);

  return <ListView
      flexGrow={1}
      UNSAFE_className={classNames.navListView}
      items={items}
      selectedKeys={selected}
      disallowEmptySelection
      ref={listElRef}
      selectionMode="single"
      selectionStyle="highlight"
      onSelectionChange={(selectedKeys: Selection) => {
	const key = selectedKeys !== 'all'
	  ? `${selectedKeys.keys().next().value}`
	  : undefined;
	if (key) {
	  onSelect(key);
	}
      }}
      //onExpandedChange={useMemo(() => (onExpand
      //  ? (keys => onExpand(new Set(Array.from(keys).filter(k => typeof k === 'string'))))
      //  : undefined), [onExpand])}
      aria-label="Resource hierarchy">
    {itemView}
  </ListView>
});


export function computeImplicitlyExpanded(
  pageMap: Record<string, string>,
  predicate: (resourceID: string) => boolean,
  _parents: string[],
): string[] {
  const foundParents: string[] = [];
  const foundParentPaths: string[] = [''];
  for (const [pagePath, resourceID] of Object.entries(pageMap)) {
    if (foundParents.includes(pagePath)) {
      continue;
    }
    if (predicate(resourceID)) {
      let remainder = pagePath;
      while (remainder) {
	foundParentPaths.push(remainder);
	remainder = remainder.includes('/')
	  ? remainder.slice(0, remainder.lastIndexOf('/'))
	  : '';
      }
    }
  }
  return foundParentPaths.map(p => pageMap[p]).filter(uri => uri !== undefined);
}
