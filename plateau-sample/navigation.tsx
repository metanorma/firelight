import React, { useCallback } from 'react';


interface NavItem {
  /** Navigation item key is globally unique across all items. */
  itemKey: string;
  children: NavItem[];
}


const WindowedNavigation: React.FC<{
  /** Every navigation item, regardless of whether it’s shown. */
  items: NavItem[];

  /** Keys for expanded navigation items (showing children). */
  expandedItems: string[];

  /** Keys for matching navigation items, if a query is active. */
  matchingItems: string[];

  /**
   * Whether items not matching active search query are omitted.
   * A parent item may be considered matching if at least one descendant
   * matches, to facilitate navigation to said descendant.
   */
  onlyShowMatchingItems: boolean;
}> = function () {
  const navigationItemKeys: string[] = useNavigationItemKeys();
  // TODO: prop?

  const navigationItemCount: number = navigationItemKeys.length;

  /**
   * Indices for navigation items *shown*.
   * Would omit children of collapsed items, items not matching
   * search criteria (if any), etc.
   */
  const navigationItemsShown: number[] = [];

  const shownNavigationItemCount: number = navigationItemsShown.length;

  const renderNavigationItem = useCallback((idx: number) => {
    const key = navigationItemKeys[idx];
    return <NavigationItem key={key} />;
  }, [navigationItemCount, navigationItemKeys.join(',')]);

  const listHeight = shownNavigationItemCount * itemHeight;

  return <WindowedList height={listHeight} renderItem={renderNavigationItem}>
  </WindowedList>;
};

const NavigationItem: React.FC<{
  key: string;
  isExpanded?: boolean;
  onExpand?: () => void;
  onActivate?: () => void;
}> = function ({ key, isExpanded, onExpand, onActivate }) {
  const itemData = useNavigationItemData(key);
  const caret = (itemData.hasChildren && onExpand)
    ? <Caret onClick={onExpand} isExpanded={isExpanded} />
    : null;
  const itemView = <>{itemData.title}</>;
  return <div>
    {caret}
    {onActivate ? <a onClick={onActivate}>{itemView}</a> : itemView}
  </div>;
};
