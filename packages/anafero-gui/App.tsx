import * as S from '@effect/schema/Schema';
import { motion } from 'framer-motion';
import { defaultTheme, ProgressBar, Flex, Provider } from '@adobe/react-spectrum';
import { useInView, InView } from 'react-intersection-observer';
import { useThrottledCallback, useDebouncedCallback } from 'use-debounce';
import type { Index as LunrIndex } from 'lunr';
import React, { useCallback, createContext, useState, useReducer, useMemo, useEffect, useLayoutEffect } from 'react';
import { Helmet } from 'react-helmet';
import { type LayoutModule, type ResourceNav, ResourceNavSchema } from 'anafero/index.mjs';
import { type Versioning, VersioningSchema } from 'anafero/index.mjs';
import { fillInLocale, type ResourceMetadata } from 'anafero/index.mjs';
import { stripLeadingSlash, stripTrailingSlash } from 'anafero/index.mjs';
import { Bookmarks, Search } from './Nav.jsx';
import { Hierarchy as Hierarchy2, computeImplicitlyExpanded } from './NavHierarchy2.jsx';
import { reducer, createInitialState, type InitializerInput, type BrowsingMode, type StoredAppState, StoredAppStateSchema } from './model.mjs';
import { BrowserBar } from './BrowseBar.jsx';
import { ResourceHelmet, Resource, type ResourceData } from './Resource.jsx';
import { type LoadProgress, makeLoader } from './loader.mjs';
import { loadLunrIndex } from './search.mjs';
import interceptNav from './intercept-nav.mjs';
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
] as const;
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

  /** Global path prefix. */
  const pathPrefix: string = 
    useMemo(() => document.documentElement.dataset.pathPrefix ?? '', []);

  /** Removes global path prefix. */
  const getSiteRootRelativePath = useMemo(() => pathPrefix === ''
    ? ((slashPrependedPath: string) => slashPrependedPath)
    : ((slashPrependedPath: string) => {
        const unprefixed = slashPrependedPath.startsWith(pathPrefix)
          ? slashPrependedPath.replace(pathPrefix, '')
          : slashPrependedPath;
        if (!unprefixed.startsWith('/')) {
          console.error("Non-slash-prepended path after getSiteRootRelativePath!", unprefixed, slashPrependedPath);
        }
        //console.debug("Unprefixed path", slashPrependedPath, unprefixed);
        return unprefixed;
      }), [pathPrefix]);

  /** Ensures global path prefix. */
  const getDomainRelativePath:
  <T extends string>(s: T) => T | `${string}${T}` =
  useMemo(() => pathPrefix === ''
    ? ((slashPrependedPath) => slashPrependedPath)
    : ((slashPrependedPath) => {
        const prefixed = !slashPrependedPath.startsWith(pathPrefix)
          ? `${pathPrefix}${slashPrependedPath}` as `${string}${typeof slashPrependedPath}`
          : slashPrependedPath;
        return prefixed;
      }), [pathPrefix]);

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

  const resourceDescriptions: Record<string, ResourceMetadata> =
    versionDeps?.['/resource-descriptions.json'];

  /**
   * Based on current URL, returns active version ID,
   * or null if it’s the current version.
   */
  const nonCurrentActiveVersionID = useMemo(() =>
    !sharedDeps?.['/versions.json']
      ? undefined
      : (Object.
          keys(sharedDeps['/versions.json'].versions).
          find((vID) =>
            window.location.pathname.startsWith(`${pathPrefix ?? '/'}${vID}/`)
          ) ?? null),
    [sharedDeps?.['/versions.json']]);

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

  /**
   * Version prefix is undefined if versioning information is N/A
   * (e.g., still loading),
   * and empty string if the active version is also current
   * (i.e., latest/living/trunk/head) version.
   * Otherwise, is a slash-prepended active version ID.
   */
  const versionPrefix: string | undefined =
    nonCurrentActiveVersionID === undefined
      ? undefined
      : nonCurrentActiveVersionID
        ? `/${nonCurrentActiveVersionID}`
        : '';

  /**
   * Returns versioned & prefixed path,
   * i.e. “absolute” path (relative only to domain name).
   */
  const getAbsolutePath = useMemo(() => (
    versionPrefix !== undefined || pathPrefix !== ''
      ? function (slashPrependedPath: string): string {
          const versioned = `${pathPrefix}${versionPrefix}${slashPrependedPath}`;
          //console.debug("getAbsolutePath", slashPrependedPath, versioned);
          return versioned;
        }
      : undefined
  ), [pathPrefix, versionPrefix]);

  /** Returns unversioned & unprefixed path (relative to current version). */
  const getVersionRelativePath = useMemo(() => (
    versionPrefix !== undefined
      ? function getVersionRelativePath(slashPrependedPath: string): string {
          const siteRootRelative = getSiteRootRelativePath(slashPrependedPath);
          if (!versionPrefix) {
            return siteRootRelative;
          }
          const unversioned = versionPrefix !== '' && versionPrefix !== undefined && siteRootRelative.startsWith(versionPrefix)
            ? siteRootRelative.replace(versionPrefix, '')
            : siteRootRelative;
          if (!unversioned.startsWith('/')) {
            console.error("Non-slash-prepended path in getVersionRelativePath!");
          }
          //console.debug("Version-relative path", slashPrependedPath, unversioned);
          return unversioned;
        }
      : undefined
  ), [versionPrefix, getSiteRootRelativePath]);

  //const normalizedResourcePathFromPathname =
  const initialResourceURI_: string | undefined = resourceMap && getVersionRelativePath
    ? resourceMap[stripLeadingSlash(
        getVersionRelativePath(
          stripTrailingSlash(decodeURIComponent(window.location.pathname))
          + window.location.hash)
      )]
    : undefined;

  const initialResourceURI = initialResourceURI_ ?? (
    // Try once again but without the fragment (in case it is malformed)
    getVersionRelativePath && resourceMap
    ? resourceMap[stripLeadingSlash(
        getVersionRelativePath(
          stripTrailingSlash(decodeURIComponent(window.location.pathname))
        )
      )]
    : undefined
  );

  if (resourceMap && getVersionRelativePath && !initialResourceURI) {
    throw new Error("Unable to obtain initial resource URI based on URL");
  }

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
    (!reverseResourceMap || !getAbsolutePath)
      ? undefined
      : (uri: string) => {
          if (reverseResourceMap[uri] !== undefined) {
            return getAbsolutePath(`/${reverseResourceMap[uri]}`);
          } else {
            console.error("Failed to get path for resource", uri, reverseResourceMap);
            throw new Error("Failed to get path for resource");
          }
        }
  ), [getAbsolutePath, reverseResourceMap]);

  const reverseResource = useMemo((() =>
    (!resourceMap || !getVersionRelativePath)
      ? undefined
      // TODO: Inconsistent with locateResource,
      // this is allowed to return undefined. Might want to reconsider
      : (path: string) => resourceMap[stripLeadingSlash(getVersionRelativePath(path))]
  ), [resourceMap, getVersionRelativePath]);

  const getResourceDataPaths = useMemo(() =>
    !locateResource
      ? undefined
      : function getResourceDataPaths(uri: string): Record<keyof ResourceData, string> {
          const rpath = locateResource(uri).split('#')[0]!;
          //if (rpath.includes('#')) {
          //  throw new Error("Will not return data asset paths for a resource that does not have its own page");
          //}
          return Object.entries(RESOURCE_DATA_PATHS).
            map(([propID, path]) =>
              ({ [propID]: [stripTrailingSlash(rpath), path].join('/') })).
            reduce((prev, curr) =>
              ({ ...prev, ...curr }), {}
            ) as Record<keyof ResourceData, string>;
        },
    [locateResource, reverseResourceMap]);

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
    } else {
      return;
    }
  }, [fetchJSON, initialResourceURI, fetchResourceData, setInitialResourceData]);

  const setLoadProgressThrottled = useThrottledCallback(setLoadProgress, 200);

  useEffect(() => {
    const depURLs = SHARED_DEPS.map(getDomainRelativePath);
    return fetchJSON(
      depURLs,
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
          filter(([src]) => depURLs.includes(src as any)).
          map(([src, resp]) => ({ [getSiteRootRelativePath(src)]: resp })).
          reduce((prev, curr) =>
            ({ ...prev, ...curr }),
            {},
          ) as SharedDeps);
        },
    );
  }, [fetchJSON, getSiteRootRelativePath, getDomainRelativePath]);

  useEffect(() => {
    if (!getAbsolutePath || !getVersionRelativePath) { return; }
    // Fetch version-wide data & make it available in the object under
    // non-versioned paths
    // (e.g., /<version>/resource-map.json will be available as /resource-map.json).
    return fetchJSON<keyof VersionDeps>(
      VERSION_DEPS.map(dep => getAbsolutePath(dep)) as (keyof VersionDeps)[],
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
            VERSION_DEPS.includes(getVersionRelativePath(src) as keyof VersionDeps)).
          map(([src, resp]) => ({ [getVersionRelativePath(src)]: resp })).
          reduce((prev, curr) =>
            ({ ...prev, ...curr }),
            {},
          ) as VersionDeps);
        },
    );
  }, [fetchJSON, getAbsolutePath, getVersionRelativePath]);

  const primaryLanguageDetected = useMemo((
    () => resourceMap && resourceMap[''] && resourceDescriptions[resourceMap['']]
      ? resourceDescriptions[resourceMap['']]?.primaryLanguageID ?? 'en'
      : undefined
  ), [resourceDescriptions, resourceMap]); 

  const primaryLanguage = primaryLanguageDetected ?? 'en';

  const lunrIndex = useMemo(() => {
    const serializedIndex = versionDeps?.['/search-index.json'];

    if (serializedIndex && primaryLanguageDetected) {
      return loadLunrIndex(serializedIndex);
    } else {
      return undefined;
    }
  }, [primaryLanguageDetected, versionDeps?.['/search-index.json']]);


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
    && primaryLanguage
    && getVersionRelativePath
    && locateResource
    && reverseResource
    && fetchResourceData
    && versioning
    && lunrIndex
    && initialResourceURI
    && initialResourceData
    && loadedDependencies
    && dependencyIndex
    && getAbsolutePath)

    ? <VersionWorkspace
        workspaceTitle={workspaceTitle}
        primaryLanguage={primaryLanguage}
        dependencies={loadedDependencies}
        locateResource={locateResource}
        reverseResource={reverseResource}
        getAbsolutePath={getAbsolutePath}
        getVersionRelativePath={getVersionRelativePath}
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
        <BrowserBar
          rootURL={`${pathPrefix}/`}
          title={workspaceTitle}
          loadProgress={loadProgress}
        />
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
  primaryLanguage: string;
  searchIndex: LunrIndex;
  getAbsolutePath: (path: string) => string;
  getVersionRelativePath: (path: string) => string;
  locateResource: (uri: string) => string;
  reverseResource: (rpath: string) => string | undefined;
  fetchResourceData: (uri: string, onDone: (data: ResourceData) => void) => () => void;
  resourceDescriptions: Record<string, ResourceMetadata>;
  dependencies: Record<string, unknown>;
  dependencyIndex: { layouts: string[], contentAdapters: string[] };
  initialResource: string;
  initialResourceData: ResourceData;
  versioning: Versioning;
  resourceMap: Record<string, string>;
  storedState?: StoredAppState | undefined;
  onStoreState?: (newState: StoredAppState) => void;
}> = function ({
  workspaceTitle,
  primaryLanguage,
  initialResource,
  initialResourceData,
  fetchResourceData,
  dependencies,
  getAbsolutePath,
  getVersionRelativePath,
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

  const getContainingPageResourceURI = useCallback((uri: string) => {
    const path = locateResource(uri).split('#')[0]!;
    return reverseResource(path) ?? '';
  }, [locateResource, reverseResource]);

  const initialPage = getContainingPageResourceURI(initialResource);

  const [state, dispatch] = useReducer<typeof reducer, InitializerInput>(
    reducer,
    { initialResource, initialPage, stored: storedState } as InitializerInput,
    createInitialState);

  // Resource dependencies keyed by resource ID.
  // Either the actual dependency object ready to be passed to <Resource />,
  // or a function to *cancel* the fetching of dependencies for that resource
  // (in case it’s no longer needed, e.g., the user scrolled away).
  // Testing for whether the value is a function is a way of testing
  // whether resource data is still loading.
  const [resourceDeps, setResourceDeps] =
    useState<Record<string, ResourceData | undefined>>({});

  useEffect(() => {
    const { expandedResourceURIs, bookmarkedResourceURIs, searchQuery } = state;
    onStoreState?.({ expandedResourceURIs, bookmarkedResourceURIs, searchQuery });
  }, [state]);


  // Fetch dependencies for newly visible resources

  const resourceIDsPendingDependencies = state.visibleResourceURIs.
    filter(uri => resourceDeps[uri] === undefined);
  const [loadingResources, setLoadingResources] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;

    if (resourceIDsPendingDependencies.length < 1) {
      return;
    }

    const fetchDependencies = async function () {
      const promises: Promise<Record<string, ResourceData>>[] =
      resourceIDsPendingDependencies.map(id =>
        new Promise((resolve, reject) => {
          fetchResourceData(id, (data) => {
            resolve({ [id]: data });
          })
        })
      )
      const data: Record<string, ResourceData> =
        (await Promise.all(promises)).
        reduce((prev, curr) => ({ ...prev, ...curr }), {});

      setLoadingResources(ids =>
        ids.filter(id => !Object.keys(data).includes(id))
      );

      if (cancelled) {
        return;
      }

      setResourceDeps(deps => ({
        ...deps,
        ...data,
      }));
    };

    setLoadingResources(resourceIDsPendingDependencies);

    fetchDependencies();

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
      cancelled = true;
    };
  }, [resourceIDsPendingDependencies.join(','), fetchResourceData]);

  const layout =
    (dependencies[dependencyIndex.layouts[0]!]! as LayoutModule).layouts[0]!;

  const getResourceTitle = useCallback((
    (uri: string) => resourceDescriptions[uri]?.labelInPlainText ?? uri
  ), [resourceDescriptions]);

  const getResourceLocale = useCallback((
    (uri: string) => fillInLocale(resourceDescriptions[uri]?.primaryLanguageID ?? 'en')
  ), [resourceDescriptions]);

  const getDependency = useCallback(function getDependency<T>(modID: string) {
    return dependencies[modID] as T;
  }, [dependencies]);

  const activePageResourceURI = useMemo(() => {
    return getContainingPageResourceURI(state.activeResourceURI);
  }, [state.activeResourceURI, getContainingPageResourceURI]);

  // History stuff

  // Handle the pop
  useEffect(() => {
    const handlePopState = function () {
      const uri = typeof history.state?.res === 'string'
        ? history.state.res
        : undefined;
      let path: string | null = null;
      if (uri) {
        try {
          path = locateResource(uri);
        } catch (e) {
          console.error("Error locating resource while popping state", e);
          path = null;
        }
      } else {
        path = null;
      }
      if (uri && path) {
        const [, fragment] = expandResourcePath(path);
        dispatch({ type: 'activated_resource', uri, pageURI: getContainingPageResourceURI(uri) });

        if (fragment) {
          setQueuedFragment(fragment.slice(1));
        }
      } else {
        console.warn("While popping state, could not resolve resource URI or locate resource path", uri, history.state?.res);
        // ??
        //window.location.reload();
        return;
      }
    }
    window.addEventListener('popstate', handlePopState);
    // TODO: This should run if the app crashes,
    // because it disrupts navigation otherwise (#87)
    return function cleanUp() {
      window.removeEventListener('popstate', handlePopState);
    }
  }, [dispatch, locateResource, getContainingPageResourceURI]);

  // Push to history and set queuedFragment if needed
  useEffect(() => {
    const res = state.activeResourceURI;
    const rpath = locateResource(res);
    const [expandedPath, fragment] = expandResourcePath(rpath);
    if (!history.state?.res) {
      history.replaceState({ res }, '', expandedPath);
    } else if (history.state.res !== res) {
      history.pushState({ res }, '', expandedPath);
    }
    if (fragment) {
      setQueuedFragment(fragment.slice(1));
    }
  }, [locateResource, state.activeResourceURI]);

  const [resourceContainerElement, setResourceContainerElement] =
    useState<null | HTMLDivElement>(null);

  // Intercept internal link clicks
  const setUpInterceptor = useCallback((resourcesRef: HTMLDivElement) => {
    if (resourcesRef) {
      setResourceContainerElement(resourcesRef);
    }

    // TODO: Do something with returned interceptor cleanup function?
    // TODO: Definitely remove interceptor if app failed with uncaught error.
    interceptNav(resourcesRef, {
      // shadowDom: true,
    }, function handleIntercept (evt: MouseEvent | KeyboardEvent, el: Element) {

      const href = el.getAttribute('href');
      if (!href || !getVersionRelativePath) {
        return;
      }
      const url = new URL(href, document.baseURI);
      const maybePrefixedURL = decodeURIComponent(url.pathname) + url.hash;

      // NOTE: Technically, in current implementation, if url.hash is present
      // then the hash fragment IS the actual resource URI of the subresource
      // on page. However, perhaps we don’t want to rely on that being true?
      // const resourceURI = url.hash
      //   ? decodeURIComponent(url.hash)
      //   : reverseResource(maybePrefixedURL);

      const resourceURI = reverseResource(maybePrefixedURL);
      //console.debug("Intercepted", maybePrefixedURL, resourceURI, url.hash, url);

      if (resourceURI) {
        dispatch({ type: 'activated_resource', uri: resourceURI, pageURI: getContainingPageResourceURI(resourceURI) });
        evt.stopPropagation();
        evt.preventDefault();
        return false;
      } else {
        console.error(
          "Failed to get resource URI",
          maybePrefixedURL,
          stripLeadingSlash(getVersionRelativePath(stripTrailingSlash(maybePrefixedURL))),
        );
        return true;
      }
    });
  }, [reverseResource, getVersionRelativePath, getContainingPageResourceURI]);

  // Queue hash fragment to navigate to subresources more precisely
  // after page load is finished. If no subresource was requested,
  // then set to string NONE to distinguish from empty state.
  const [queuedFragment, setQueuedFragment] = useState('');

  // Navigate to a resource specifically by jumping via some link
  // (in navigation or content), not say by scrolling.
  // Handles the case where the link goes to a subresource.
  const jumpTo = useCallback((uri: string) => {
    //const path = locateResource(uri);
    if (getContainingPageResourceURI(uri) === uri) {
      setQueuedFragment('NONE');
    }

    console.debug("Jumping & activating resource", uri);

    dispatch({ type: 'activated_resource', uri, pageURI: getContainingPageResourceURI(uri) });
  }, [setQueuedFragment, getContainingPageResourceURI, dispatch]);

  // Navigate to a resource specifically by jumping via some link
  // (in navigation or content), not say by scrolling.
  // Handles the case where the link goes to a subresource.
  const navigate = useCallback(function navigate(path: string) {
    const resourceURI = reverseResource(path);
    if (!resourceURI) {
      console.error("Unable to reverse resource URI for path", path);
      throw new Error("Unable to reverse resource URI for path");
    }

    console.debug("Navigating & activating resource", resourceURI);

    dispatch({ type: 'activated_resource', uri: resourceURI, pageURI: getContainingPageResourceURI(resourceURI) });
  }, [reverseResource, jumpTo, getContainingPageResourceURI]);

  const pageMap: Record<string, string> = useMemo(
    function computePageMap () {
      const pageMap = { ...resourceMap };
      for (const key of Object.keys(pageMap).filter(p =>
          // Exclude in-page resources from page map
          p.includes('#')
          // TODO: Find a better way to exclude static files from page map
          // This can have both false negatives and false positives
          || p.includes('.'))) {
        delete pageMap[key];
      }
      return pageMap;
    },
    [resourceMap]);

  /** We ignore/disallow arbitrary selection for now. */
  const actualSelectedPageResources = useMemo((() =>
    new Set([activePageResourceURI])
  ), [activePageResourceURI]);

  /**
   * Implicitly expanded resources include:
   *
   * 1) root resource,
   * 2) selected & parents of selected resource.
   */
  const implicitlyExpanded = useMemo(() => {
    return new Set(computeImplicitlyExpanded(
      pageMap,
      (id) => actualSelectedPageResources.has(id),
      [],
    ));
  }, [pageMap, actualSelectedPageResources]);

  /**
   * Resources specifically expanded by the user + implicitly expanded ones.
   */
  const actualExpanded: Set<string> = useMemo((() => {
    return new Set([
      resourceMap['']!,
      ...Array.from(state.expandedResourceURIs),
      ...Array.from(implicitlyExpanded),
    ])
  }), [implicitlyExpanded, resourceMap, state.expandedResourceURIs]);

  const routerProps = useMemo(() => ({ router: { navigate } }), [navigate]);

  const isLoading = loadingResources.length > 0;

  // Scroll to selected subresource
  // NOTE: Why don’t we do it in nodeView instead?
  useLayoutEffect(() => {
    if (!isLoading && resourceContainerElement && queuedFragment) {
      function scrollToResource() {
        if (!queuedFragment) {
          return;
        }
        if (queuedFragment === 'NONE') {
          setQueuedFragment('');

          window.scrollTo(0, 0);
          // TODO: Don’t break own abstraction
          // Needed because the following can cause glitchy behavior otherwise:
          // 1. Open a resource page with child resource subpages
          // 2. Scroll through all subpages to the bottom until auto-load stops
          // 3. Click on the first subpage. Since scroll position is bottom,
          //    the marker will trigger loading all subsequent subpages.

        } else {
          if (!resourceContainerElement) {
            console.warn("Cannot scroll to resource: no resource container element");
            return;
          }
          const resourceURI = decodeURIComponent(queuedFragment);
          const el = document.getElementById(resourceURI)
            ?? resourceContainerElement.querySelector(`[about="${resourceURI}"]`);
          if (el) {
            try {
              //if (el.hasOwnProperty('scrollIntoViewIfNeeded')) {
              //  el.scrollIntoViewIfNeeded();
              //} else {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              //}
            } catch (e) {
              console.error("Failed to scroll element into view", resourceURI);
            }
            console.debug("Scrolled to element for resource", resourceURI);
            setQueuedFragment('');
          } else {
            console.warn("Element not found for resource to scroll to", resourceURI);
          }
        }
      }

      // In case there’s a delay in element’s appearing in DOM tree:
      const observer = new MutationObserver(scrollToResource);
      scrollToResource();
      observer.observe(resourceContainerElement, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
      });

      // Clean up queued fragment if DOM tree is stuck for some reason
      // (shouldn’t happen)
      const timeout = setTimeout(() => {
        setQueuedFragment('');
        observer.disconnect();
        console.warn("Scroll to element timed out");
      }, 5000);

      return function () {
        observer.disconnect();
        window.clearTimeout(timeout);
      };
    }
    return function () {};
  }, [isLoading, queuedFragment, resourceContainerElement]);

  const lastVisibleResourceMarkerIntersection = useInView({
    threshold: 0,
    initialInView: false,
  });

  const loadNextResource = useCallback((lastResource: string, lastResourceParentPath: string) => {
    const abortController = new AbortController();
    (async () => {
      let nextResourceURI: string | undefined = undefined;
      try {
        const lastResourcePath = locateResource(getContainingPageResourceURI(lastResource));
        const nextResourcePath = await getAdjacentResource(
          lastResourcePath,
          lastResourceParentPath,
          'after',
          abortController.signal,
        );
        nextResourceURI = reverseResource(nextResourcePath);
        if (!nextResourceURI) {
          console.error("Can’t reverse next resource URI", nextResourcePath);
          throw new Error("Can’t reverse next resource URI");
        }
      } catch (e) {
        console.warn("Failed to load next resource", e);
      }
      if (nextResourceURI) {
        dispatch({ type: 'scrolled_next_resource_into_view', uri: nextResourceURI });
      }
    })();
    return function cleanUpLoadingNext() {
      abortController.abort();
    }
  }, [dispatch, locateResource, reverseResource, getContainingPageResourceURI]);

  useEffect(() => {
    if (lastVisibleResourceMarkerIntersection.inView
        && state.selectedResourceURIs.length === 1) {
      const lastResource = state.visibleResourceURIs[state.visibleResourceURIs.length - 1];
      if (!lastResource) {
        return;
      }
      const lastResourceData = resourceDeps[lastResource];
      if (!lastResourceData) {
        return;
      }
      const lastResourceParentPath = lastResourceData.nav.breadcrumbs[0]?.path;
      if (!lastResourceParentPath) {
        return;
      }
      return loadNextResource(lastResource, lastResourceParentPath);
    }
    return;
  }, [
    lastVisibleResourceMarkerIntersection.inView,
    state.visibleResourceURIs,
    state.selectedResourceURIs,
    resourceDeps,
    reverseResource,
    loadNextResource,
  ]);

  const handleActivateByScroll = useThrottledCallback((uri: string) => {
    dispatch({ type: 'activated_resource_by_scrolling', uri });
  }, 100, { trailing: true });

  const locale = useMemo((
    // Empty string in resource map refers to site’s root resource.
    () => resourceMap && resourceMap['']
      ? getResourceLocale(resourceMap[''])
      : 'en-US'
  ), [getResourceLocale, resourceMap]);

  const activeResourceContent = useMemo(() => {
    const dep = resourceDeps[state.activeResourceURI];
    return dep?.content?.content ?? undefined;
  }, [resourceDeps, state.activeResourceURI]);

  return (
    <>
      <Helmet><html lang={primaryLanguage} /></Helmet>
      <BrowserBar
        title={workspaceTitle}
        loadProgress={isLoading ? true : undefined}
        providerProps={routerProps}
        versioning={versioning}
        activeBrowsingMode={state.browsingMode}
        rootURL={getAbsolutePath('/')}
        onActivateBrowsingMode={useCallback((mode: BrowsingMode) => dispatch({
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
            const isActive = uri === activePageResourceURI;
            const isOnlyOneShown = state.visibleResourceURIs.length < 2;
            const isMarkedActive = !isOnlyOneShown && isActive;
            const isLoading = loadingResources.includes(uri);
            const data = uri === initialPage
              ? initialResourceData
              : !isLoading
                ? resourceDeps[uri]
                : undefined;

            // Animation
            const isFirst = idx === 0;
            const shouldAnimateEntry = !isFirst;
            //const shouldAnimateEntry = false;
            const Component = shouldAnimateEntry ? AnimatedResource : Resource;
            //const Loader = shouldAnimateEntry ? AnimatedDiv : 'div';
            const animateProps = shouldAnimateEntry
              ? {
                  initial: 'removed',
                  animate: 'enteredView',
                  variants: {
                    removed: {
                      opacity: 0,
                      transform: 'translateY(100px)',
                    },
                    enteredView: {
                      opacity: 1,
                      transition: { duration: 1 },
                      transform: 'translateY(0)',
                    },
                  },
                }
              : {};

            return data !== undefined
              ? <InView key={uri} rootMargin="0% 0% -100% 0%" initialInView={isActive}>
                  {({ inView, ref }) => {
                    if (inView && activePageResourceURI !== uri) {
                      // TODO: Intermittently(?) causes https://reactjs.org/link/setstate-in-render
                      // when it updates state during render
                      handleActivateByScroll(uri);
                    }
                    return <Component
                      ref={ref}
                      key={uri}
                      uri={uri}
                      requestedResourceURI={state.activeResourceURI}
                      searchQueryText={state.searchQuery.text}
                      graph={data.graph}
                      content={data.content}
                      aria-selected={isMarkedActive}
                      className={state.browsingMode || isMarkedActive
                        ? `
                            ${state.browsingMode ? classNames.withNav : ''}
                            ${isMarkedActive ? classNames.active : ''}
                          `
                        : ''}
                      nav={data.nav}
                      document={document}
                      locateResource={locateResource}
                      getResourcePlainTitle={getResourceTitle}
                      reverseResource={reverseResource}
                      onIntegrityViolation={console.error}
                      selectedLayout={layout}
                      useDependency={getDependency}
                      {...animateProps}
                    />;
                  }}
                </InView>
              : <div
                    key={uri}
                    className={`
                      ${classNames.resourceLoadingOrMissingPlaceholder}
                      ${state.browsingMode ? classNames.withNav : ''}
                    `}>
                  <a href={locateResource(uri)}>{getResourceTitle(uri)}</a>
                  {isLoading
                    ? <ProgressBar
                        labelPosition="side"
                        label="Loading resource…"
                        isIndeterminate
                      />
                    : null}
                </div>
          })}
        </Provider>
      </main>

      {/* This is needed here when multiple resources are visible,
          to make sure the active resource is the one dictating HTML title.
          key is used to force re-render and reset title when resources are loading. */}
      {activeResourceContent
        ? <ResourceHelmet
            key={`
              ${state.activeResourceURI}
              ${state.visibleResourceURIs.join(' ')}
              ${loadingResources.join(' ')}
              ${Object.keys(resourceDeps).join(' ')}
            `}
            {...activeResourceContent}
          />
        : null}

      <div
          ref={lastVisibleResourceMarkerIntersection.ref}
          className={classNames.lastVisibleResourceMarkerIntersection}>
        &nbsp;
      </div>

      {state.browsingMode
        ? <Provider theme={defaultTheme} {...routerProps}>
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
              {state.browsingMode === 'hierarchy' && pageMap && getResourceTitle
                ? <Hierarchy2
                    pageMap={pageMap}
                    getResourceTitle={getResourceTitle}
                    expanded={actualExpanded}
                    implicitlyExpanded={implicitlyExpanded}
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
                    selected={actualSelectedPageResources}
                    onSelect={jumpTo}
                  />
                : state.browsingMode === 'search'
                  ? <Search
                      query={state.searchQuery}
                      index={searchIndex}
                      getPlainTitle={getResourceTitle}
                      locateResource={locateResource}
                      getContainingPageURI={getContainingPageResourceURI}
                      onEditQueryText={newText => dispatch({ type: 'edited_search_query_text', newText })}
                      selected={state.activeResourceURI}
                      onSelect={jumpTo}
                    />
                  : state.browsingMode === 'bookmarks'
                    ? <Bookmarks
                        bookmarkedResources={state.bookmarkedResourceURIs}
                        onRemoveBookmark={(uri) => dispatch({ type: 'removed_resource_bookmark', uri })}
                        getPlainTitle={getResourceTitle}
                        locateResource={locateResource}
                        onNavigate={(uri) => dispatch({ type: 'activated_resource', uri, pageURI: getContainingPageResourceURI(uri) })}
                      />
                    : null}
            </Flex>
          </Provider>
        : null}
    </>
  );
};


const AnimatedResource = motion.create(Resource);
//const AnimatedDiv = motion.create('div');


// TODO: Stop requiring parent’s resource navigation data to locate siblings
// Technically, it should be possible to do using resource map…
async function getAdjacentResource(
  currentPath: string,
  parentPath: string,
  order: 'after',
  signal: AbortSignal,
): Promise<string> {
  if (!parentPath) {
    throw new Error("getAdjacentResource: missing parentPath");
  }
  const parentNavPath = [parentPath, 'resource-nav.json'].join('/');
  const parentNav = S.decodeUnknownSync(ResourceNavSchema)
    (await (await fetch(parentNavPath, { signal })).json()) as ResourceNav;
  const currentPathTail = currentPath.slice(currentPath.lastIndexOf('/') + 1);
  const children = parentNav.children.map(
    ({ path }) => path.slice(path.lastIndexOf('/') + 1));
  const childIndex = children.findIndex(path =>
    path === currentPathTail);
  if (childIndex >= 0) {
    const nextChildIndex = childIndex + 1;
    const nextChild = parentNav.children[nextChildIndex]
    if (nextChild) {
      return nextChild.path;
    } else {
      throw new Error("Unable to get adjacent resource: no next child");
    }
  } else {
    throw new Error("Unable to get adjacent resource: not a child of parent");
  }
}

/**
 * From resource path (as in resource map),
 * obtain root-relative (including version) path to structural resource,
 * and in-page resource hash fragment as a separate string.
 *
 * Page resource path is returned with trailing slash
 * if there’s no in-page subresource,
 * in-page subresource is returned with leading hash,
 */
function expandResourcePath(rpath: string): [path: string, hash: string | null] {
  const hasFragment = rpath.indexOf('#') >= 0;
  const [beforeFragment, maybeFragment] = hasFragment
    ? rpath.split('#') as [string, string]
    : [rpath.split('#')[0], null] as [string, null];
  const maybeTrailingSlash = (beforeFragment !== '' && !beforeFragment.endsWith('/'))
    ? '/'
    : '';
  const maybeFragmentSeparator = hasFragment
    ? '#'
    : '';
  const withTrailing =
    `${beforeFragment}${maybeTrailingSlash}${maybeFragmentSeparator}${maybeFragment ?? ''}`
  return [
    withTrailing,
    maybeFragment ? `#${maybeFragment}` : null,
  ] as [string, string | null];
}
