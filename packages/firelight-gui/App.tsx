import * as S from '@effect/schema/Schema';
import { motion } from 'framer-motion';
import { defaultTheme, Flex, Provider } from '@adobe/react-spectrum';
import { useInView, InView } from "react-intersection-observer";
import { useThrottledCallback, useDebouncedCallback } from 'use-debounce';
import lunr, { type Index as LunrIndex } from 'lunr';
import React, { useCallback, createContext, useState, useReducer, useMemo, useEffect } from 'react';
import { LayoutModule, ResourceNavSchema } from 'anafero/index.mjs';
import { type Versioning, VersioningSchema } from 'anafero/index.mjs';
import { fillInLocale, type ResourceMetadata } from 'anafero/index.mjs';
import { reducer, createInitialState, type StoredAppState, StoredAppStateSchema } from './model.mjs';
import { BrowserBar } from './BrowseBar.jsx';
import { ResourceHelmet, Resource, type ResourceData } from './Resource.jsx';
import { type LoadProgress, makeLoader } from './loader.mjs';
import interceptNav from './intercept-nav.mjs';
import { Hierarchy, Bookmarks, Search, pathListToHierarchy, findMatchingItemParents } from './Nav.jsx';
import classNames from './style.module.css';

export const BrowsingContext = createContext({
  bookmarkedResources: new Set<string>(),
  bookmarkResource: (uri: string) => void 0,
  selectedResources: new Set<string>(),
  selectResource: (uri: string) => void 0,
});


/** Files shared between all versions. */
const SHARED_DEPS = [
  '/versions.json',
];
type SharedDeps = Record<typeof SHARED_DEPS[number], any>;

/** Version-wide data. */
const VERSION_DEPS = [
  '/dependencies.json',
  '/dependency-index.json',
  '/search-index.json',
  '/resource-map.json',
  //'/resource-graph.json',
  '/resource-descriptions.json',
] as const;
type VersionDeps = Record<typeof VERSION_DEPS[number], any>;


export const AppLoader: React.FC<Record<never, never>> = function () {

  const workspaceTitle =
    useMemo(() => document.documentElement.dataset.workspaceTitle, []);

  if (!workspaceTitle) {
    throw new Error("Missing initial workspace title");
  }

  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ done: 0, total: 0 });

  const [versionDeps, setVersionDeps] =
    useState<undefined | VersionDeps>(undefined);

  const [sharedDeps, setSharedDeps] =
    useState<undefined | SharedDeps>(undefined);

  const [initialResourceData, setInitialResourceData] =
    useState<undefined | ResourceData>(undefined);

  const resourceMap: Record<string, string> = versionDeps?.['/resource-map.json'];

  const reverseResourceMap: undefined | Record<string, string> = useMemo((() =>
    !resourceMap ? undefined :
    Object.fromEntries(Object.entries(resourceMap).
    map(([k, v]) => [v, k]))
  ), [resourceMap]);

  const nonCurrentActiveVersionID = useMemo(() =>
    !sharedDeps?.['/versions.json']
      ? undefined
      : (Object.
          keys(sharedDeps['/versions.json'].versions).
          find((vID) =>
            window.location.pathname.startsWith(`/${vID}/`)
          ) ?? null),
    [sharedDeps?.['/versions.json']]);

  const resourceDescriptions: Record<string, ResourceMetadata> =
    versionDeps?.['/resource-descriptions.json'];

  const versioning = useMemo(() => {
    if (!sharedDeps?.['/versions.json'] || nonCurrentActiveVersionID === undefined) {
      return undefined;
    }
    const activeVersionID: string =
      (nonCurrentActiveVersionID ?? sharedDeps['/versions.json'].currentVersionID)
    return S.decodeUnknownSync(VersioningSchema)({
      ...sharedDeps['/versions.json'],
      activeVersionID,
    })
  }, [nonCurrentActiveVersionID, sharedDeps?.['/versions.json']]);

  const versionPrefix: string | undefined =
    nonCurrentActiveVersionID === undefined
      ? undefined
      : nonCurrentActiveVersionID
        ? `/${nonCurrentActiveVersionID}`
        : '';

  const getVersionedPath = useMemo(() => (
    versionPrefix !== undefined
      ? function (slashPrependedPath: string): string {
          return `${versionPrefix}${slashPrependedPath}`;
        }
      : undefined
  ), [versionPrefix]);

  const getUnversionedPath = useMemo(() => (
    versionPrefix !== undefined
      ? function (slashPrependedPath: string): string {
          if (!versionPrefix) { return slashPrependedPath; }
          return slashPrependedPath.startsWith(versionPrefix)
            ? slashPrependedPath.replace(versionPrefix, '')
            : slashPrependedPath;
        }
      : undefined
  ), [versionPrefix]);

  //const normalizedResourcePathFromPathname =
  const initialResourceURI: string | undefined = resourceMap && getUnversionedPath
    ? resourceMap[stripLeadingSlash(stripTrailingSlash(
        getUnversionedPath(decodeURIComponent(window.location.pathname))
      ))]
    : undefined;

  const fetchJSON = useCallback(function fetchJSON<T extends string>(
    paths: T[],
    onProgress: (done: number, total: number) => void,
    onDone: (result: Record<T, any>) => void,
  ): () => void {
    return makeLoader<T>(
      paths.
        map(dep => ({ [dep]: { responseType: 'json' } as const })).
        reduce((prev, curr) =>
          ({ ...prev, ...curr }),
          {},
        ) as Record<T, { responseType: 'json' }>,
      (done, total) => onProgress(
        done.reduce((a, b) => a + b),
        total.reduce((a, b) => a + b),
      ),
      (src, msg, resp) => console.error("Error fetching", src, msg, resp),
      (src, resp) => {
        //console.debug("Fetched", src);
      },
      onDone,
    ).load();
  }, []);

  const locateResource = useMemo((() =>
    !reverseResourceMap ? undefined :
    (uri: string) => reverseResourceMap[uri]
  ), [reverseResourceMap]);

  const reverseResource = useMemo((() =>
    !resourceMap ? undefined :
    (path: string) => resourceMap[path]
  ), [resourceMap]);

  const getResourceDataPaths = useMemo(() =>
    !getVersionedPath || !locateResource ? undefined :
    function getResourceDataPaths(uri: string): Record<keyof ResourceData, string> {
      const rpath = locateResource(uri);
      if (rpath === undefined) {
        console.error("Failed to get path for resource", uri, reverseResourceMap);
      }
      return Object.entries(RESOURCE_DATA_PATHS).
        map(([propID, path]) =>
          ({ [propID]: getVersionedPath(`${rpath !== '' ? '/' : ''}${rpath}/${path}`) })).
        reduce((prev, curr) =>
          ({ ...prev, ...curr }), {}
        ) as Record<keyof ResourceData, string>;
    },
    [locateResource, reverseResourceMap, getVersionedPath]);

  const fetchResourceData = useMemo(() =>
    !getResourceDataPaths ? undefined :
    function fetchResourceData(uri: string, onDone: (data: ResourceData) => void): () => void {
      const dataPaths = getResourceDataPaths(uri);
      return fetchJSON(Object.values(dataPaths),
        () => void 0, //console.debug,
        (results) => {
          onDone(Object.entries(dataPaths).
            filter(([, src]) => Object.keys(results).
              includes(src)).
            map(([propID, src]) => ({ [propID]: results[src] })).
            reduce((prev, curr) =>
              ({ ...prev, ...curr }),
              {},
            ) as ResourceData);
        });
    },
    [getResourceDataPaths, fetchJSON]);

  useEffect(() => {
    if (initialResourceURI !== undefined && fetchResourceData) {
      return fetchResourceData(initialResourceURI, setInitialResourceData);
    }
  }, [fetchJSON, initialResourceURI, fetchResourceData, setInitialResourceData]);

  const setLoadProgressThrottled = useThrottledCallback(setLoadProgress, 200);

  useEffect(() => {
    return fetchJSON<keyof SharedDeps>(
      SHARED_DEPS,
      (done, total) => setLoadProgressThrottled({
        done,
        total,
      }),
      (results) => {
        setLoadProgressThrottled({
          done: 100,
          total: 100,
        })
        setSharedDeps(Object.entries(results).
          filter(([src]) => SHARED_DEPS.includes(src as keyof SharedDeps)).
          map(([src, resp]) => ({ [src]: resp })).
          reduce((prev, curr) =>
            ({ ...prev, ...curr }),
            {},
          ) as SharedDeps);
        },
    );
  }, [fetchJSON]);

  useEffect(() => {
    if (!getVersionedPath || !getUnversionedPath) { return; }
    // Fetch version-wide data & make it available in the object under
    // non-versioned paths
    // (e.g., /<version>/resource-map.json will be available as /resource-map.json).
    return fetchJSON<keyof VersionDeps>(
      VERSION_DEPS.map(dep => getVersionedPath(dep)) as (keyof VersionDeps)[],
      (done, total) => setLoadProgressThrottled({
        done,
        total,
      }),
      (results) => {
        setLoadProgressThrottled({
          done: 100,
          total: 100,
        })
        setVersionDeps(Object.entries(results).
          filter(([src]) =>
            VERSION_DEPS.includes(getUnversionedPath(src) as keyof VersionDeps)).
          map(([src, resp]) => ({ [getUnversionedPath(src)]: resp })).
          reduce((prev, curr) =>
            ({ ...prev, ...curr }),
            {},
          ) as VersionDeps);
        },
    );
  }, [fetchJSON, getVersionedPath, getUnversionedPath]);

  const lunrIndex = useMemo(() => (
    versionDeps?.['/search-index.json']
      ? lunr.Index.load(versionDeps['/search-index.json'])
      : undefined
    ), [versionDeps?.['/search-index.json']]);


  // Persisting state crudely

  const [restoredState, setRestoredState] = useState<StoredAppState | undefined>(undefined);
  useEffect(() => {
    const maybeState = localStorage.getItem('stored-state');
    try {
      const parsedState = JSON.parse(maybeState ?? '');
      setRestoredState(S.decodeUnknownSync(StoredAppStateSchema)(parsedState));
    } catch (e) {
      console.error("Failed to restore app state", e, maybeState);
      return undefined;
    }
  }, []);
  const handleStoreState = useDebouncedCallback(function (newState: StoredAppState) {
    //console.debug("storing state", newState);
    setTimeout(() => {
      localStorage.setItem('stored-state', JSON.stringify({
        ...newState,
        expandedResourceURIs: Array.from(newState.expandedResourceURIs),
        bookmarkedResourceURIs: Array.from(newState.bookmarkedResourceURIs),
      }));
    }, 10);
  }, 1000);


  // Dynamically loaded modules

  useEffect(() => {
    (async () => {
      if (!versionDeps?.['/dependencies.json']) {
        return;
      }
      const loadedDependencies: Record<string, unknown> =
        (await Promise.all(Object.entries(versionDeps['/dependencies.json']).map(async ([modID, code]) => {
          const blob = new Blob([code as string], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          const { 'default': maybePromise } = await import(url);
          return { [modID]: await maybePromise };
        }))).reduce((prev, curr) => ({ ...prev, ...curr }), {});
      setLoadedDependencies(loadedDependencies);
    })();
  }, [versionDeps?.['/dependencies.json']]);

  const dependencyIndex = versionDeps?.['/dependency-index.json'];

  const [loadedDependencies, setLoadedDependencies] =
    useState<Record<string, unknown> | undefined>(undefined);

  const mainView = (
    resourceMap
    && getUnversionedPath
    && locateResource
    && reverseResource
    && fetchResourceData
    && versioning
    && lunrIndex
    && initialResourceURI
    && initialResourceData
    && loadedDependencies
    && dependencyIndex
    && getVersionedPath)

    ? <VersionWorkspace
        workspaceTitle={workspaceTitle}
        dependencies={loadedDependencies}
        locateResource={locateResource}
        reverseResource={reverseResource}
        expandUnversionedPath={getVersionedPath}
        getVersionLocalPath={getUnversionedPath}
        dependencyIndex={dependencyIndex}
        initialResource={initialResourceURI}
        initialResourceData={initialResourceData}
        fetchResourceData={fetchResourceData}
        versioning={versioning}
        resourceDescriptions={resourceDescriptions}
        searchIndex={lunrIndex}
        resourceMap={resourceMap}
        storedState={restoredState}
        onStoreState={handleStoreState}
      />
      // Try not to overwrite SSR’d DOM except for browser bar’s loader
    : <>
        <BrowserBar title={workspaceTitle} loadProgress={loadProgress} />
        <main id="resources">
          <div
            dangerouslySetInnerHTML={{ __html: '' }}
            suppressHydrationWarning={true}
          />
        </main>
      </>
  return mainView;
};


const RESOURCE_DATA_PATHS: Record<keyof ResourceData, string> = {
  graph: 'resource.json',
  nav: 'resource-nav.json',
  content: 'resource-content.json',
} as const;


export const VersionWorkspace: React.FC<{
  workspaceTitle: string;
  searchIndex: LunrIndex;
  expandUnversionedPath: (path: string) => string;
  getVersionLocalPath: (path: string) => string;
  locateResource: (uri: string) => string;
  reverseResource: (rpath: string) => string;
  fetchResourceData: (uri: string, onDone: (data: ResourceData) => void) => () => void;
  resourceDescriptions: Record<string, ResourceMetadata>;
  dependencies: Record<string, unknown>;
  dependencyIndex: { layouts: string[], contentAdapters: string[] };
  initialResource: string;
  initialResourceData: ResourceData;
  versioning: Versioning;
  resourceMap: Record<string, string>;
  storedState?: StoredAppState;
  onStoreState?: (newState: StoredAppState) => void;
}> = function ({
  workspaceTitle,
  initialResource,
  initialResourceData,
  fetchResourceData,
  dependencies,
  expandUnversionedPath,
  getVersionLocalPath,
  dependencyIndex,
  searchIndex,
  locateResource,
  reverseResource,
  resourceDescriptions,
  versioning,
  resourceMap,
  storedState,
  onStoreState,
}) {

  const [state, dispatch] = useReducer(
    reducer,
    { initialResource, stored: storedState },
    createInitialState);

  // Resource dependencies keyed by resource ID.
  // Either the actual dependency object ready to be passed to <Resource />,
  // or a function to *cancel* the fetching of dependencies for that resource
  // (in case it’s no longer needed, e.g., the user scrolled away).
  const [resourceDeps, setResourceDeps] =
    useState<Record<string, ResourceData | (() => void)>>({});

  useEffect(() => {
    const { expandedResourceURIs, bookmarkedResourceURIs, searchQuery } = state;
    onStoreState?.({ expandedResourceURIs, bookmarkedResourceURIs, searchQuery });
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    //const newDeps = { ...resourceDeps };

    // Fetch dependencies for any newly visible resources
    const resourceIDsPendingDependencies = state.visibleResourceURIs.
      filter(uri => resourceDeps[uri] === undefined);

    //console.debug("Fetching deps effect", new Date());

    for (const resourceID of resourceIDsPendingDependencies) {
      setResourceDeps(deps => ({
        ...deps,
        [resourceID]: fetchResourceData(resourceID, (data) => {
          setResourceDeps(deps => ({
            ...deps,
            [resourceID]: (
                !cancelled
                && typeof deps[resourceID] === 'function'
                && state.visibleResourceURIs.includes(resourceID))
              ? data
              : deps[resourceID],
          }));
        }),
      }));
    }

    // // Clean up deps for resources that are no longer visible?
    // // Maybe should debounce that, e.g., if the user scrolls back and forth
    // for (const resourceID of Object.keys(newDeps)) {
    //   if (!state.visibleResourceURIs.includes(resourceID)) {
    //     if (typeof newDeps[resourceID] === 'function') {
    //       // Cancel request
    //       newDeps[resourceID]();
    //     }
    //     // Remove the key
    //     delete newDeps[resourceID];
    //   }
    // }

    //setResourceDeps(newDeps);

    return function cleanup() {
      //cancelled = true;
    };
  }, [resourceDeps, state.visibleResourceURIs.join(', ')]);

  const layout =
    (dependencies[dependencyIndex.layouts[0]!]! as LayoutModule).layouts[0];

  const getResourceTitle = useCallback((
    (uri: string) => resourceDescriptions[uri]?.labelInPlainText ?? uri
  ), [resourceDescriptions]);

  const getResourceLanguage = useCallback((
    (uri: string) => fillInLocale(resourceDescriptions[uri]?.primaryLanguageID ?? 'en')
  ), [resourceDescriptions]);

  const getDependency = useCallback(function getDependency<T>(modID: string) {
    return dependencies[modID] as T;
  }, [dependencies]);

  // History stuff

  /**
   * From resource path (as in resource map),
   * obtain root-relative (including version) path to structural resource,
   * and in-page resource as a separate string.
   */
  const expandResourcePath = useCallback(((rpath: string): [structuralResourceFullPath: string, inPageResourceHashFragment: string | null] => {
    const hasFragment = rpath.indexOf('#') >= 1;
    const expanded = expandUnversionedPath(`/${rpath}${rpath !== '' && !hasFragment ? '/' : ''}`)
    return [
      expanded,
      hasFragment ? `#${rpath.split('#')[1]!}` : null,
    ] as [string, string];
  }), [expandUnversionedPath]);

  // Handle the pop
  useEffect(() => {
    const handlePopState = function() {
      const uri = typeof history.state?.res === 'string'
        ? history.state.res
        : undefined;
      let path: string | null = null;
      try {
        path = locateResource(uri);
      } catch (e) {
        console.error("Error locating resource while popping state", e);
        path = null;
      }
      if (uri && path) {
        const [expanded, fragment] = expandResourcePath(path);
        dispatch({ type: 'activated_resource', uri });
        if (fragment) {
          window.location.hash = fragment;
        }
      } else {
        console.warn("When popping state, could not resolve resource URI or locate resource path");
        // ??
        window.location.reload();
        return;
      }
    }
    window.addEventListener('popstate', handlePopState);
    return function cleanUp() {
      window.removeEventListener('popstate', handlePopState);
    }
  }, [dispatch, locateResource, expandResourcePath]);

  // Do the push
  useEffect(() => {
    const res = state.activeResourceURI;
    const rpath = locateResource(res);
    const [expandedPath, fragment] = expandResourcePath(rpath);
    if (!history.state?.res) {
      history.replaceState({ res }, '', expandedPath);
    } else if (history.state.res !== res) {
      history.pushState({ res }, '', expandedPath);
    }
    // We can’t select non-structural resources yet, so we patch up
    // selected resource to nearest structural parent.
    if (fragment) {
      dispatch({ type: 'activated_resource', uri: res });
    }
  }, [expandResourcePath, locateResource, state.activeResourceURI]);

  // Intercept internal link clicks
  const setUpInterceptor = useCallback((resourcesRef: HTMLDivElement) => {
    // TODO: Do something with returned interceptor cleanup function?
    interceptNav(resourcesRef, {
      // shadowDom: true,
    }, function handleIntercept (evt: MouseEvent | KeyboardEvent, el: Element) {
      const href = el.getAttribute('href');
      if (!href || !getVersionLocalPath) {
        return;
      }
      const url = new URL(href, document.baseURI);
      const absoluteHref = url.pathname;
      const resourceURI = reverseResource(
        stripLeadingSlash(getVersionLocalPath(stripTrailingSlash(absoluteHref))));
      console.debug("Intercepted", resourceURI);
      if (resourceURI) {
        dispatch({ type: 'activated_resource', uri: resourceURI });
        // Selecting non-structural (in-page) resource is semi-broken
        if (url.hash) {
          window.location.hash = url.hash;
        }
        evt.stopPropagation();
        evt.preventDefault();
        return false;
      } else {
        console.error("Failed to get resource URI", absoluteHref, stripLeadingSlash(getVersionLocalPath(stripTrailingSlash(absoluteHref))));
        return true;
      }
    })
  }, [reverseResource, getVersionLocalPath]);

  const navigate = useCallback(function navigate(path: string) {
    const resourceURI = reverseResource(stripLeadingSlash(stripTrailingSlash(path)));
    dispatch({ type: 'activated_resource', uri: resourceURI });
  }, [reverseResource]);

  const hierarchy = useMemo(
    // If there’s no map, it may be loading (undefined) or broken (null),
    // return as is. Otherwise, make a hierarchy out of it
    (() => pathListToHierarchy(
      Object.keys(resourceMap ?? {}),
      ((path) => ({
        path,
        id: resourceMap?.[path] ?? `cannot get URI for ${path}`,
        name: getResourceTitle(resourceMap?.[path] ?? path),
      })),
    )),
    [resourceMap, getResourceTitle]);

  /** We ignore/disallow arbitrary selection for now. */
  const actualSelected = useMemo((() =>
    new Set([state.activeResourceURI])
  ), [state.activeResourceURI]);

  /** Always expanded: 1) root, 2) selected & parents of selected. */
  const actualExpanded = useMemo((() => {
    return new Set([
      hierarchy[0].id,
      ...Array.from(state.expandedResourceURIs),
      ...findMatchingItemParents(
        hierarchy,
        (i) => actualSelected.has(i.id),
        [],
      ),
    ])
  }), [hierarchy, state.expandedResourceURIs, actualSelected]);

  const routerProps = useMemo(() => ({ router: { navigate } }), [navigate]);

  const isLoading = Object.values(resourceDeps).find(val => typeof val === 'function');

  const lastVisibleResourceMarkerIntersection = useInView({
    threshold: 0,
    initialInView: true,
  });

  const loadNextResource = useCallback((lastResource: string, lastResourceParentPath: string) => {
    const abortController = new AbortController();
    (async () => {
      let nextResourceURI: string | null = null;
      try {
        const lastResourcePath = locateResource(lastResource);
        const nextResourcePath = await getAdjacentResource(
          `/${lastResourcePath}`,
          stripLeadingSlash(lastResourceParentPath),
          'after',
          abortController.signal,
        );
        nextResourceURI = reverseResource(nextResourcePath);
        if (!nextResourceURI) {
          console.error("Can’t reverse next resource URI", nextResourcePath);
          throw new Error("Can’t reverse next resource URI");
        }
      } catch (e) {
        console.error("Failed to load next resource", e);
      }
      if (nextResourceURI) {
        dispatch({ type: 'scrolled_next_resource_into_view', uri: nextResourceURI });
      }
    })();
    return function cleanUpLoadingNext() {
      abortController.abort();
    }
  }, [dispatch, locateResource]);

  useEffect(() => {
    if (lastVisibleResourceMarkerIntersection.inView
        && state.selectedResourceURIs.length === 1) {
      const lastResource = state.visibleResourceURIs[state.visibleResourceURIs.length - 1];
      const lastResourceData = resourceDeps[lastResource];
      if (!lastResourceData || typeof lastResourceData === 'function') {
        return;
      }
      const lastResourceParentPath = lastResourceData.nav.breadcrumbs[0]?.path;
      if (!lastResourceParentPath) {
        return;
      }
      return loadNextResource(lastResource, lastResourceParentPath);
    }
  }, [
    lastVisibleResourceMarkerIntersection.inView,
    state.visibleResourceURIs,
    state.selectedResourceURIs,
    resourceDeps,
    locateResource,
    reverseResource,
    dispatch,
  ]);

  const handleActivateByScroll = useThrottledCallback((uri: string) => {
    dispatch({ type: 'activated_resource_by_scrolling', uri });
  }, 100, { trailing: true });

  const locale = state.visibleResourceURIs.length > 0
    ? getResourceLanguage(state.visibleResourceURIs[0])
    : 'en-US';

  return (
    <>
      <BrowserBar
        title={workspaceTitle}
        loadProgress={isLoading ? true : undefined}
        providerProps={routerProps}
        versioning={versioning}
        activeBrowsingMode={state.browsingMode}
        onActivateBrowsingMode={useCallback((mode) => dispatch({
          type: 'activated_browsing_mode',
          mode,
        }), [])}
        onDeactivate={useCallback(() => dispatch({
          type: 'deactivated_browsing_mode',
        }), [])}
      />
      <main id="resources" ref={setUpInterceptor}>
        <Provider theme={defaultTheme} locale={locale}>
          {state.visibleResourceURIs.map((uri, idx) => {
            const isFirst = idx === 0;
            const shouldAnimateEntry = !isFirst;
            const isOnlyOneShown = state.visibleResourceURIs.length < 2;
            const Component = shouldAnimateEntry ? AnimatedResource : Resource;
            const isActive = state.activeResourceURI === uri;
            const isMarkedActive = !isOnlyOneShown && isActive;
            const data = uri === initialResource
              ? initialResourceData
              : resourceDeps[uri] && typeof resourceDeps[uri] !== 'function'
                ? resourceDeps[uri]
                : undefined;
            return data !== undefined
              ? <React.Fragment key={uri}>
                  <InView rootMargin="0% 0% -80% 0%">
                    {({ inView, ref }) => {
                      if (inView && state.activeResourceURI !== uri) {
                        handleActivateByScroll(uri);
                      }
                      return <div
                        ref={ref}
                        style={{ position: 'relative', top: '50px' }}
                        aria-label=""
                        role="presentation"
                      />;
                    }}
                  </InView>
                  <Component
                    //key={uri}
                    uri={uri}
                    graph={data.graph}
                    content={data.content}
                    aria-selected={isMarkedActive}
                    className={`
                      ${state.browsingMode ? classNames.withNav : ''}
                      ${isOnlyOneShown ? classNames.onlyOne : ''}
                      ${isMarkedActive ? classNames.active : ''}
                    `}
                    nav={data.nav}
                    document={document}
                    locateResource={locateResource}
                    getResourcePlainTitle={getResourceTitle}
                    reverseResource={reverseResource}
                    onIntegrityViolation={console.error}
                    selectedLayout={layout}
                    useDependency={getDependency}
                    {...(shouldAnimateEntry ? {
                      initial: 'removed',
                      animate: 'enteredView',
                      variants: {
                        removed: {
                          opacity: 0,
                          transform: 'translateY(100px)',
                        },
                        enteredView: {
                          opacity: 1,
                          transition: { duration: 1, delay: .2 * idx },
                          transform: 'translateY(0)',
                        },
                      },
                    } : {})}
                  />
                  {(isActive || isOnlyOneShown) && data.content.content
                    ? <ResourceHelmet {...data.content.content} />
                    : null}
                </React.Fragment>
              : <div style={{ textAlign: 'right' }}>Loading</div>
          })}
        </Provider>
      </main>

      <div
        ref={lastVisibleResourceMarkerIntersection.ref}
        style={{ position: 'relative', top: '-100px', zIndex: 22, textAlign: 'right' }}>&nbsp;</div>

      {state.browsingMode
        ? 
          <Provider theme={defaultTheme} {...routerProps}>
            <Flex
                aria-role="nav"
                aria-label="Resource navigation options"
                direction="column"
                alignItems="stretch"
                gap={5}
                UNSAFE_className={`
                  ${classNames.nav}
                  ${state.browsingMode === 'hierarchy' ? classNames.navWithHierarchy : ''}
                `}>
              {state.browsingMode === 'hierarchy' && hierarchy
                ? <Hierarchy
                    hierarchy={hierarchy}
                    expanded={actualExpanded}
                    selected={actualSelected}
                    onSelect={(uri) => dispatch({ type: 'activated_resource', uri })}
                    onExpand={(expandedURIs) => {
                      expandedURIs.forEach(uri =>
                        dispatch({ type: 'expanded_resource', uri })
                      );
                      Array.from(state.expandedResourceURIs).
                      filter(res => !expandedURIs.has(res)).
                      forEach(uri =>
                        dispatch({ type: 'collapsed_resource', uri })
                      );
                    }}
                  />
                : state.browsingMode === 'search'
                  ? <Search
                      query={state.searchQuery}
                      index={searchIndex}
                      getPlainTitle={getResourceTitle}
                      locateResource={locateResource}
                      onEditQueryText={newText => dispatch({ type: 'edited_search_query_text', newText })}
                    />
                  : state.browsingMode === 'bookmarks'
                    ? <Bookmarks
                        bookmarkedResources={state.bookmarkedResourceURIs}
                        onRemoveBookmark={(uri) => dispatch({ type: 'removed_resource_bookmark', uri })}
                        getPlainTitle={getResourceTitle}
                        locateResource={locateResource}
                        onNavigate={(uri) => dispatch({ type: 'activated_resource', uri })}
                      />
                    : null}
            </Flex>
          </Provider>
        : null}
    </>
  );
};


const AnimatedResource = motion.create(Resource);


async function getAdjacentResource(
  currentPath: string,
  parentPath: string,
  order: 'after',
  signal: AbortSignal,
): Promise<string> {
  const parentNavPath = parentPath
    ? [parentPath, 'resource-nav.json'].join('/')
    : 'resource-nav.json';
  const parentNav = S.decodeUnknownSync(ResourceNavSchema)
    (await (await fetch(`/${parentNavPath}`, { signal })).json());
  const currentPathTail = currentPath.slice(currentPath.lastIndexOf('/') + 1);
  const children = parentNav.children.map(
    ({ path }) => path.slice(path.lastIndexOf('/') + 1));
  const childIndex = children.findIndex(path =>
    path === currentPathTail);
  if (childIndex >= 0) {
    const nextChildIndex = childIndex + 1;
    const nextChild = parentNav.children[nextChildIndex]
    if (nextChild) {
      return stripLeadingSlash(nextChild.path);
    } else {
      throw new Error("Unable to get adjacent resource: no next child");
    }
  } else {
    throw new Error("Unable to get adjacent resource: not a child of parent");
  }
}


function stripLeadingSlash(aPath: string): string {
  return aPath.replace(/^\//, '');
}

function stripTrailingSlash(aPath: string): string {
  return aPath.replace(/\/$/, '');
}