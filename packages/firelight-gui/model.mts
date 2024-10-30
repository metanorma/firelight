import * as S from '@effect/schema/Schema';


const BrowsingModeSchema = S.Literal('hierarchy', 'search', 'bookmarks');
export type BrowsingMode = S.Schema.Type<typeof BrowsingModeSchema>;

const SearchQuerySchema = S.Struct({
  text: S.String,
});
export type SearchQuery = S.Schema.Type<typeof SearchQuerySchema>;

/**
 * Constraints that cannot be expressed here:
 *
 * - visibleResourceURIs cannot be empty, must always contain activeResourceURI
 * - selectedResourceURIs cannot be empty, must always contain activeResourceURI
 * - if selectedResourceURIs is has more than one element,
 *   then visibleResourceURIs must contain the exact same elements
 * - if selectedResourceURIs is has more than one element,
 *   then scrolling any resources into view cannot occur
 * - activating resource by scrolling is only possible if resource
 *   is in visibleResourceURIs
 */
interface AppState {
  /** Selected resource URIs come in order of selection. */
  selectedResourceURIs: string[];
  /**
   * Explicitly expanded by the user resources.
   * Implicitly expanded can also be a thing, but they don’t count here.
   */
  expandedResourceURIs: Set<string>;
  /** Resources loaded in view. */
  visibleResourceURIs: string[];
  /** Selected resource, affects URL, maintains top position in the viewport. */
  activeResourceURI: string;
  bookmarkedResourceURIs: Set<string>;
  searchQuery: SearchQuery;
  browsingMode: BrowsingMode | undefined;

  //sidebarWidth: 400;
  //navigationOpened: boolean;
}


export const StoredAppStateSchema = S.Struct({
  expandedResourceURIs: S.Set(S.String),
  bookmarkedResourceURIs: S.Set(S.String),
  searchQuery: SearchQuerySchema,
});

export type StoredAppState = S.Schema.Type<typeof StoredAppStateSchema>;


type Action =
  //| { type: 'opened_navigation', uri: string }
  | { type: 'activated_browsing_mode', mode: BrowsingMode }
  | { type: 'deactivated_browsing_mode' }

  | { type: 'scrolled_next_resource_into_view', uri: string }
  | { type: 'scrolled_previous_resource_into_view', uri: string }
  | { type: 'activated_resource_by_scrolling', uri: string }

  | { type: 'activated_resource', uri: string }

  | { type: 'added_resource_to_selection', uri: string }
  | { type: 'removed_resource_from_selection', uri: string }

  | { type: 'expanded_resource', uri: string }
  | { type: 'collapsed_resource', uri: string }

  | { type: 'added_resource_bookmark', uri: string }
  | { type: 'removed_resource_bookmark', uri: string }

  | { type: 'edited_search_query_text', newText: string }
;

export function createInitialState(opts: { initialResource: string, stored?: StoredAppState }): AppState {
  return {
    activeResourceURI: opts.initialResource,
    selectedResourceURIs: [opts.initialResource],
    visibleResourceURIs: [opts.initialResource],
    browsingMode: undefined,

    ...(opts.stored ? opts.stored : {
      expandedResourceURIs: new Set(),
      bookmarkedResourceURIs: new Set(),
      searchQuery: { text: '' },
    }),
  };
}

const MAX_RESOURCES_IN_VIEW = 7;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'activated_browsing_mode':
      return {
        ...state,
        browsingMode: action.mode,
      };
    case 'deactivated_browsing_mode':
      return {
        ...state,
        browsingMode: undefined,
      };
    //case 'opened_navigation':
    //  return {
    //    ...state,
    //    navigationOpened: true,
    //  };
    case 'edited_search_query_text':
      return {
        ...state,
        searchQuery: {
          ...state.searchQuery,
          text: action.newText,
        },
      };
    case 'scrolled_next_resource_into_view':
      if (state.selectedResourceURIs.length > 1) {
        console.warn("Invalid state");
        return state;
      }
      return {
        ...state,
        visibleResourceURIs: state.visibleResourceURIs.includes(action.uri)
          ? state.visibleResourceURIs
          : [...state.visibleResourceURIs, action.uri],
          //: [...state.visibleResourceURIs.slice(
          //    state.visibleResourceURIs.length - MAX_RESOURCES_IN_VIEW,
          //    state.visibleResourceURIs.length,
          //  ), action.uri],
      };
    case 'scrolled_previous_resource_into_view':
      if (state.selectedResourceURIs.length > 1) {
        console.warn("Invalid state");
        return state;
      }
      return {
        ...state,
        visibleResourceURIs: state.visibleResourceURIs.includes(action.uri)
          ? state.visibleResourceURIs
          : [action.uri,
            ...state.visibleResourceURIs.slice(0, MAX_RESOURCES_IN_VIEW)],
      };
    case 'activated_resource_by_scrolling':
      // Should only be possible if:
      // - The resource is already visible (was scrolled into view)
      // - There is no multiple resource selection
      if (!state.visibleResourceURIs.includes(action.uri)) {
        return state;
      }
      if (state.selectedResourceURIs.length > 1) {
        return state;
      }
      return {
        ...state,
        selectedResourceURIs: [action.uri],
        activeResourceURI: action.uri,
      };
    // Single resource was jumped to,
    // e.g. by clicking in hierarchy, search, bookmarks or navigation.
    // TODO: rename to activated?
    case 'activated_resource':
      if (state.activeResourceURI === action.uri) {
        return state;
      }
      if (!action.uri) {
        return state;
      }
      const selectedAfterActivation =
        // With multiple selection, if activated resource is selected
        // then keep selection, otherwise reset selection
        state.selectedResourceURIs.length > 1 && state.selectedResourceURIs.includes(action.uri)
          ? state.selectedResourceURIs
          : [action.uri];

      const visibleAfterActivation = selectedAfterActivation.length > 1
        ? [...selectedAfterActivation]
        : [action.uri];
      // Selected items are pushed to the end of the list,
      // but should be visible first
      visibleAfterActivation.reverse();

      return {
        ...state,
        activeResourceURI: action.uri,
        selectedResourceURIs: selectedAfterActivation,
        visibleResourceURIs: visibleAfterActivation,
      };
    // If there are multiple selected resources, then scrolling no longer
    // dynamically loads & selects resources.
    case 'added_resource_to_selection':
      if (state.selectedResourceURIs.includes(action.uri)) {
        return state;
      }
      return {
        ...state,
        activeResourceURI: action.uri,
        selectedResourceURIs: [...state.selectedResourceURIs, action.uri],
        visibleResourceURIs: [action.uri, ...state.selectedResourceURIs],
      };
    case 'removed_resource_from_selection':
      if (!state.selectedResourceURIs.includes(action.uri)) {
        return state;
      }
      const idx = state.selectedResourceURIs.indexOf(action.uri);
      const withoutDeselected = state.selectedResourceURIs.toSpliced(idx, 1);
      // Activate most recently selected resource
      if (state.activeResourceURI === action.uri && withoutDeselected.length > 0) {
        state.activeResourceURI = withoutDeselected[withoutDeselected.length - 1]!;
      }
      return {
        ...state,
        selectedResourceURIs: withoutDeselected,
        visibleResourceURIs: withoutDeselected,
      };
    case 'expanded_resource':
      if (state.expandedResourceURIs.has(action.uri)) {
        return state;
      }
      const withExpanded = [...Array.from(state.expandedResourceURIs), action.uri];
      return {
        ...state,
        expandedResourceURIs: new Set(withExpanded),
      };
    case 'collapsed_resource':
      if (!state.expandedResourceURIs.has(action.uri)) {
        return state;
      }
      const withoutCollapsed = Array.from(state.expandedResourceURIs);
      withoutCollapsed.splice(withoutCollapsed.indexOf(action.uri), 1);
      return {
        ...state,
        expandedResourceURIs: new Set(withoutCollapsed),
      };
    case 'added_resource_bookmark':
      if (state.bookmarkedResourceURIs.has(action.uri)) {
        return state;
      }
      return {
        ...state,
        bookmarkedResourceURIs:
          new Set([...state.bookmarkedResourceURIs, action.uri ]),
      };
    case 'removed_resource_bookmark':
      if (!state.bookmarkedResourceURIs.has(action.uri)) {
        return state;
      }
      const w = new Set(state.bookmarkedResourceURIs);
      w.delete(action.uri)
      return {
        ...state,
        bookmarkedResourceURIs: w,
      };
  }
}

//type SpecialArray<U, B, N extends number, R extends any[] = [U]> =
//    R["length"] extends N
//        ? R
//        : R | SpecialArray<U, B, N, [...R, B]> | SpecialArray<U, B, N, [B, ...R]>
//;
//
//interface AppState<CurrentURI extends string> {
//  selectedResourceURIs: Set<string>;
//  expandedResourceURIs: Set<string>;
//  visibleResourceURIs: SpecialArray<string, CurrentURI, 5>;
//  activeResourceURI: CurrentURI;
//  bookmarkedResourceURIs: Set<string>;
//  searchQuery: SearchQuery;
//  browsingMode: BrowsingMode | undefined;
//}
