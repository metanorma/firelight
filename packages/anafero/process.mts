// TODO: This file needs splitting

import * as S from '@effect/schema/Schema';

import { renderToString } from 'react-dom/server';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Provider, defaultTheme } from '@adobe/react-spectrum';


// Initialize search
import lunr from 'lunr';

import enableLunrStemmer from 'lunr-languages/lunr.stemmer.support';
import enableTinyLunrSegmenter from 'lunr-languages/tinyseg';
import enableLunrFr from 'lunr-languages/lunr.fr';
import enableLunrJa from 'lunr-languages/lunr.ja';
import enableLunrMultiLanguage from 'lunr-languages/lunr.multi';

enableLunrStemmer(lunr);
enableTinyLunrSegmenter(lunr);

const lunrLanguageSupport = {
  ja: enableLunrJa,
  fr: enableLunrFr,
} as const;
// End initialize search


import { type VersionMeta } from './versioning.mjs';
import {
  type BuildConfig,
  BuildConfigSchema,
  type DependencyResolver,
} from './Config.mjs';
import {
  type StoreAdapterModule,
} from './StoreAdapter.mjs';
import {
  type ContentAdapterModule,
  type ResourceContent,
  type AdapterGeneratedResourceContent,
  type ResourceMetadata,
  gatherDescribedResourcesFromJsonifiedProseMirrorNode,
  fillInLocale,
} from './ContentAdapter.mjs';
import {
  ROOT_SUBJECT,
  type RelationGraphAsList,
} from './relations.mjs';
import { type LayoutModule, type NavLink } from './Layout.mjs';
import { BrowserBar } from 'firelight-gui/BrowseBar.jsx';
import { Resource, type ResourceProps } from 'firelight-gui/Resource.jsx';
import {
  type TaskProgressCallback,
  type TaskNoticeCallback,
} from './progress.mjs';

import { makeContentReader } from './ContentReader.mjs';
import { type Cache } from './cache.mjs';

import { isURIString } from './URI.mjs';


const encoder = new TextEncoder();
const decoder = new TextDecoder();


interface LunrIndexEntry {
  name: string;
  body: string;
}


interface GeneratorHelpers {
  fetchBlob: (path: string, opts?: { atVersion?: string }) => Promise<Uint8Array>;
  fetchDependency: DependencyResolver;
  getDependencyCSS: (modID: string) => Uint8Array | null;
  getDependencySource: (modID: string) => string;
  decodeXML: (data: Uint8Array) => Document;
  getDOMStub: () => Document;
  reportProgress: TaskProgressCallback;
  reportNotice: TaskNoticeCallback;
  cache: Cache;
}

/** Arbitrary stuff to inject in HTML. */
interface StringsToInjectIntoHTML {
  /** To be included within <html> tag. */
  htmlAttrs?: string | undefined;
  /** To be included in the head, e.g. CSS. */
  head?: string | undefined;
  /** To be included at the end, e.g. optional JS. */
  tail?: string | undefined;
}

/**
 * Since we currently generate content on two occasions—
 * when generating resource’s page itself, and when generating
 * nav links to it—we cache generated content per path.
 */
type ResourceContentCache = Record<string, AdapterGeneratedResourceContent>;

/** Emits blobs keyed by resource-relative paths. */
export function * generateResourceAssets(
  resourceURI: string,
  relations: Readonly<RelationGraphAsList>,
  /** Graphs for parents, starting with nearest parent up. */
  parentChain: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][],
  /** Graphs for descendants (probably in order). */
  directDescendants: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][],
  resourceProps: Omit<ResourceProps, 'nav' | 'graph' | 'content' | 'document'>,

  /**
   * Used to expand a version-relative path to an absolute domain-relative
   * (includnig site root prefix, if any).
   */
  expandVersionedPath: (versionRelativePath: string) => string,

  getDOMStub: GeneratorHelpers['getDOMStub'],

  // TODO: Refactor HTML generation
  inject: StringsToInjectIntoHTML,

  workspaceTitle: string,
  primaryLanguageID: string,

  /** Called to describe a related resource. */
  describe: (graph: Readonly<RelationGraphAsList>, uri: string) =>
    ResourceMetadata | null,
  /** Called to generate page content. */
  generateContent: (graph: Readonly<RelationGraphAsList>, uri: string) =>
    AdapterGeneratedResourceContent | null,
): Generator<Record<string, Uint8Array>> {

  const generatedContent = generateContent(relations, resourceURI);
  if (!generatedContent) {
    console.warn("Resource has no content", resourceURI);
    return;
  }

  const generateNavLink = function generateNavLink(
    path: string,
    uri: string,
    graph: Readonly<RelationGraphAsList>,
  ): NavLink {
    return {
      path: expandVersionedPath(path),
      plainTitle: (describe(graph, uri))?.labelInPlainText ?? uri,
    };
  };
  const resourceNav: { breadcrumbs: NavLink[], children: NavLink[] } = {
    breadcrumbs: parentChain.map(([path, uri, graph]) =>
      generateNavLink(path, uri, graph)),
    children: directDescendants.map(([path, uri, graph]) =>
      generateNavLink(path, uri, graph)),
  };

  yield {
    '/resource.json': encoder.encode(JSON.stringify(relations, null, 4)),
    '/resource-content.json': encoder.encode(JSON.stringify(generatedContent, null, 4)),
    '/resource-nav.json': encoder.encode(JSON.stringify(resourceNav, null, 4)),
  };

  const resourceHTML = renderToString(
    React.createElement(Provider, {
      theme: defaultTheme,
      locale: fillInLocale(primaryLanguageID),
      children: [
        React.createElement(Resource, {
          ...resourceProps,
          key: resourceURI,
          document: getDOMStub(),
          content: generatedContent,
          nav: resourceNav,
          graph: relations,
        }),
      ],
    }));
  const browseBarHTML = renderToString(React.createElement(BrowserBar, {
    title: workspaceTitle,
    rootURL: expandVersionedPath('/'),
  }));

  const helmet = Helmet.renderStatic();

  const htmlPage = `
    <!doctype html>
    <html ${helmet.htmlAttributes.toString()}
        ${inject.htmlAttrs}
        data-initial-resource-id="${resourceURI}"
        data-workspace-title="${workspaceTitle}">
      <head>
        <meta charset="utf-8">
        ${helmet.title.toString()}
        ${helmet.meta.toString()}
        ${helmet.link.toString()}
        ${inject.head}
      </head>
      <body ${helmet.bodyAttributes.toString()}>
        <div id="app">${browseBarHTML}<main id="resources">${resourceHTML}</main></div>
        ${inject.tail}
      </body>
    </html>
  `;

  yield {
    '/index.html': encoder.encode(htmlPage),
  };

}


export async function * generateVersion(
  cfg: BuildConfig,
  fetchBlobAtThisVersion: (objectPath: string) => Promise<Uint8Array>,
  {
    cache,
    getDOMStub,
    fetchDependency,
    getDependencyCSS,
    getDependencySource,
    decodeXML,
    reportProgress,
    reportNotice,
  }:
    Pick<GeneratorHelpers, 'cache' | 'getDOMStub' | 'fetchDependency' | 'getDependencySource' | 'getDependencyCSS' | 'decodeXML' | 'reportProgress' | 'reportNotice'>,
  inject: StringsToInjectIntoHTML,
  /**
   * Used to expand a version-relative path to an absolute domain-relative
   * (includnig site root prefix, if any).
   */
  expandVersionedPath: (versionRelativePath: string) => string,
): AsyncGenerator<Record<string, Uint8Array>> {

  const [dependencyProgress, , dependencyNotice] = reportProgress('load extensions');

  // For every specified reader module, instantiate it in advance
  const storeAdapters =
    (await Promise.all(cfg.storeAdapters.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<StoreAdapterModule>(moduleRef, dependencyProgress) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const contentAdapters =
    (await Promise.all(cfg.contentAdapters.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<ContentAdapterModule>(moduleRef, dependencyProgress) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const layoutModules =
    (await Promise.all(cfg.resourceLayouts.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<LayoutModule>(moduleRef, dependencyProgress) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  dependencyProgress(null);

  const layouts = layoutModules[cfg.resourceLayouts[0]]!.layouts;
  const defaultLayout = layouts[0]!.layout;

  dependencyNotice(`Building with:
  Store adapters: ${Object.values(storeAdapters).map(m => m.name).join(', ')}
  Content adapters: ${Object.values(contentAdapters).map(m => m.name).join(', ')}
  Layouts: ${Object.values(layoutModules).map(m => m.name).join(', ')}
  `, 'info');

  if (!defaultLayout || cfg.storeAdapters.length < 1 || cfg.contentAdapters.length < 1) {
    throw new Error("Missing configuration: need at least one each module: layout, store adapter, content adapter");
  }

  // Prepare this version’s dependency index
  /** Sorts dependency module ID by category. */
  const dependencyIndex = {
    storeAdapters: Object.keys(storeAdapters),
    contentAdapters: Object.keys(contentAdapters),
    layouts: cfg.resourceLayouts,
  } as const;

  // Prepare this version’s dependency sources
  const dependencySources: Record<string, string> = {};
  for (const modID of [...cfg.storeAdapters, ...cfg.contentAdapters, ...cfg.resourceLayouts]) {
    dependencySources[modID] = getDependencySource(modID);
  }

  // Emit the above
  yield {
    '/dependency-index.json': encoder.encode(JSON.stringify(dependencyIndex, null, 4)),
    '/dependencies.json': encoder.encode(JSON.stringify(dependencySources, null, 4)),
  };

  // Emit dependency CSS
  const supportingCSSLinks: string[] = [];
  for (const modID of [...cfg.resourceLayouts, ...cfg.contentAdapters]) {
    const supportingCSS = getDependencyCSS(modID);
    if (supportingCSS) {
      const cssURLWithLeadingSlash = `${modID.slice(modID.lastIndexOf('/'))}.css`;
      supportingCSSLinks.push(cssURLWithLeadingSlash);
      yield { [cssURLWithLeadingSlash]: supportingCSS };
    }
  }

  // Stuff to inject in HTML
  const dependencyCSS = supportingCSSLinks.map(url =>
    `<link rel="stylesheet" href="${expandVersionedPath(url)}" />`
  ).join('\n');

  const extraHead = `${dependencyCSS}\n${inject.head ?? ''}`;

  ///** The first content adapter specified. */
  //const contentAdapter = contentAdapters[cfg.contentAdapters[0]]!;

  /**
   * For now we only allow one content adapter.
   *
   * Returns the first content adapter that reports being able
   * to generate content for given resource URI, or null.
   */
  const findContentAdapter = function (
    resourceURI: string,
    //relations: Readonly<RelationGraphAsList>,
  ): [string, ContentAdapterModule] {
    for (const [moduleID, contentAdapter] of Object.entries(contentAdapters)) {
      if (contentAdapter.canGenerateContent(resourceURI)) {
        return [moduleID, contentAdapter];
      }
    }
    throw new Error(`No content adapters report capability to generate content for ${resourceURI}`);
    //return null;

    //return [cfg.contentAdapters[0], contentAdapter];

    // If we allow multiple content adapters?..
    //
    //for (const [moduleID, contentAdapter] of Object.entries(contentAdapters)) {
    //  const relationObjects =
    //    relations.
    //    filter(([s, ,]) => s === '_:root').
    //    map(([, predicate, target]) => ({ predicate, target: target as string }));
    //  // TODO: slow
    //  for (const rel of relationObjects) {
    //    if (contentAdapter.contributesToContent(rel, await reader.resolve(rel.target))) {
    //      return [moduleID, contentAdapter];
    //    }
    //  }
    //}
    //return null;
  }

  const [contentReaderInitProgress, contentReaderSubtask] =
    reportProgress('read source data');
  const reader = await makeContentReader(
    cfg.entryPoint,
    Object.values(storeAdapters),
    function _findContentAdapter(resourceURI) {
      return findContentAdapter(resourceURI)[1];
    },
    {
      fetchBlob: fetchBlobAtThisVersion,
      decodeXML,
      cache,
      reportProgress: contentReaderSubtask,
    },
  );
  contentReaderInitProgress(null);

  const totalPaths = reader.countPaths();

  function getDependency<T>(moduleID: string) {
    return (contentAdapters[moduleID] ?? storeAdapters[moduleID]) as T;
  }

  /** Resource URIs keyed by paths (with possible hash fragments). */
  const resourceMap: Record<string, string> = {};

  /** Main resource graph (only pointers to individual resource graphs). */
  const resourceGraph: RelationGraphAsList = [];

  // TODO: Combine resourceGraph and resourceDescriptions.
  // They serve a similar purpose.

  /** Basic resource descriptions keyed by resource URI. */
  const resourceDescriptions: Record<string, ResourceMetadata> = {};

  const contentCache: ResourceContentCache = {};

  /** Maps filenames to blobs. Assets are global per version. */
  const assetsToWrite: Record<string, Uint8Array> = {};

  /**
   * If we get a language ID from the root, we pass it on
   * and use for resources that don’t specify their own.
   */
  let maybePrimaryLanguageID: string | undefined = undefined;
  let maybeMainTitle: string | undefined = undefined;

  function getReverseResourceMap() {
    return Object.fromEntries(Object.entries(resourceMap).
      map(([k, v]) => [v, k]));
  }

  const unresolved = reader.getUnresolvedRelations();
  if (unresolved.length > 0) {
    yield {
      '/unresolved-relations.json':
        encoder.encode(JSON.stringify(unresolved, null, 4)),
    };
    reportNotice("Some relations could not be resolved. See “unresolved-relations.json”.", 'warning');
  }

  let done = 0;
  const [allPathProgress, pathSubtask] =
    reportProgress('build page content', { total: totalPaths, done });
  const hierarchicalResources = reader.generatePaths();
  for (const { path, resourceURI, parentChain, directDescendants } of hierarchicalResources) {
    //console.debug("Got resource", resourceURI, path);

    let contentAdapter: ContentAdapterModule;
    try {
      contentAdapter = findContentAdapter(resourceURI)?.[1];
    } catch (e) {
      console.error("Unable to find content adapter for resource", resourceURI, e);
      continue;
    }

    done += 1;
    allPathProgress({ total: totalPaths, done });

    if (path.startsWith('/')) {
      console.error("Hierarchy generated a slash-prepended path, this is not allowed");
      throw new Error("Malformed resource URL while processing resources: leading slash");
    }
    if (path.indexOf('#') >= 0) {
      console.error("Hierarchy generated a path with hash fragment, this is not allowed");
      throw new Error("Malformed resource URL while processing resources: hash fragment");
    }

    const [pathProgress, ] =
      pathSubtask(`${resourceURI.replaceAll('|', ':')}`, { state: 'resolving relations' });

    const relations = reader.resolve(resourceURI);

    resourceMap[path] = resourceURI;
    resourceGraph.push([resourceURI, 'isDefinedBy', `${path}/resource.json`]);

    const resourceMeta = contentAdapter.describe(relations);
    // If we’re at the root, get the main title
    if (path === '' && !maybeMainTitle) {
      maybeMainTitle = resourceMeta.labelInPlainText ?? 'Workspace';
    }
    // If this is the first resource that provides a primary language ID,
    // use that as primary language ID for resources that lack one.
    if (!maybePrimaryLanguageID) {
      if (resourceMeta.primaryLanguageID) {
        console.debug(
          "Setting primary language ID:",
          resourceMeta.primaryLanguageID,
          "based on resource",
          resourceURI,
        );
        maybePrimaryLanguageID = resourceMeta.primaryLanguageID;
      }
    } else if (!resourceMeta.primaryLanguageID) {
      resourceMeta.primaryLanguageID = maybePrimaryLanguageID;
    }
    resourceDescriptions[resourceURI] = resourceMeta;

    pathProgress({ state: 'processing referenced files' });

    // Process assets on the page
    for (const [, , o] of relations) {
      if (o.startsWith('file:')) {
        // Some resource on the page is referencing a file.
        const filePath = o.split('file:')[1]!;
        const filename = o.replaceAll('/', '_').replaceAll(':', '_');
        // Unless it was seen before, add to assets and resource map.
        // encodeURIComponent should preserve original filename extension.
        if (!assetsToWrite[filename]) {
          try {
            assetsToWrite[filename] = await fetchBlobAtThisVersion(filePath);
            resourceGraph.push([
              o,
              'isDownloadableAt',
              filename,
            ]);
            resourceMap[filename] = o;
            resourceDescriptions[o] = {
              labelInPlainText: filePath,
            };
          } catch (e) {
            console.error("Failed to fetch asset", filePath);
          }
        }
      }
    }

    pathProgress({ state: 'generating page content & assets' });

    const resourceAssetGenerator = generateResourceAssets(
      resourceURI,
      relations,
      parentChain,
      directDescendants,
      {
        useDependency: getDependency,
        selectedLayout: layouts[0]!,
        getResourcePlainTitle: (uri) => resourceDescriptions[uri]?.labelInPlainText ?? uri,
        onIntegrityViolation: console.warn,
        reverseResource: (path) => getReverseResourceMap()[path]!,
        uri: resourceURI,

        // TODO: Consider slash-prepending the outcome of findURL,
        // if it’s reliably not slash-prepended
        locateResource: (uri) => expandVersionedPath(reader.findURL(uri)),
      },
      expandVersionedPath,
      getDOMStub,
      { head: extraHead, tail: inject.tail, htmlAttrs: inject.htmlAttrs },
      maybeMainTitle ?? 'Workspace',
      resourceMeta.primaryLanguageID ?? maybePrimaryLanguageID ?? 'en',
      function describe(relations, uri) {
        const maybeAdapter = findContentAdapter(uri);
        return maybeAdapter ? maybeAdapter[1].describe(relations) : null;
      },
      function generateContent(relations, uri: string) {
        if (!contentCache[uri]) {
          let content: ResourceContent | null;
          //console.debug("Generating resource content from relations", resourceURI, maybePrimaryLanguageID);
          const maybeAdapter = findContentAdapter(uri);
          if (maybeAdapter) {
            try {
              content = maybeAdapter[1].generateContent(
                relations,
              ) ?? null;
            } catch (e) {
              console.error("Failed to generate resource content",
                path,
                resourceMeta,
                uri,
                relations.slice(0, 40).join("\n"),
              );
              throw e;
            }
            contentCache[uri] = {
              adapterID: maybeAdapter[0],
              content: content
                ? { primaryLanguageID: maybePrimaryLanguageID, ...content }
                : null,
            } as const;
            if (content) {
              // Add sub-resources described by the page
              // to resource map/graph
              const describedResourceIDs =
                gatherDescribedResourcesFromJsonifiedProseMirrorNode(content.contentDoc);
              for (const inPageResourceID of describedResourceIDs) {
                if (reader.exists(inPageResourceID)) {
                  // We have a sub-resource represented by the page.
                  // Add it to resource map, too (with hash fragment).
                  const pathWithFragment = `${path}#${encodeURIComponent(inPageResourceID)}`;
                  resourceMap[pathWithFragment] = inPageResourceID;
                  resourceGraph.push([inPageResourceID, 'isDefinedBy', `${path}/resource.json`]);
                  resourceDescriptions[inPageResourceID] = {
                    primaryLanguageID: maybePrimaryLanguageID,
                    ...maybeAdapter[1].describe(relativeGraph(relations, inPageResourceID)),
                  };
                } else {
                  console.warn(
                    "Subresource on page does not exist in the graph",
                    path,
                    inPageResourceID);
                }
              }
            }
          } else {
            console.warn("No adapter found to render", uri);
            return null;
          }
        }
        return contentCache[uri]!;
      },
    );

    for (const blobChunk of resourceAssetGenerator) {
      yield Object.entries(blobChunk).map(([subpath, blob]) => {
        const assetBlobPath = `/${path}${subpath}`;
        //console.debug("Outputting resource blob at path", path, subpath, assetBlobPath);
        return { [assetBlobPath]: blob };
      }).reduce((prev, curr) => ({ ...prev, ...curr }));
    }

    pathProgress(null);
  }

  allPathProgress(null);

  for (const [filename, blob] of Object.entries(assetsToWrite)) {
    yield { [`/${filename}`]: blob };
  }

  yield {
    '/resource-map.json': encoder.encode(JSON.stringify(resourceMap, null, 4)),
    '/resource-graph.json': encoder.encode(JSON.stringify(resourceGraph, null, 4)),
    '/resource-descriptions.json': encoder.encode(JSON.stringify(resourceDescriptions, null, 4)),
  };

  const [indexProgress, ] = reportProgress('build search index');

  // Required to avoid breakage due to something about global.console:
  (lunr as any).utils.warn = console.warn;

  const lunrIndex = lunr(function () {
    console.debug(`Search index: primary language is “${maybePrimaryLanguageID}”`);
    if (maybePrimaryLanguageID && maybePrimaryLanguageID !== 'en' && lunrLanguageSupport[maybePrimaryLanguageID as keyof typeof lunrLanguageSupport]) {
      console.debug("Search index: enabling multi-language Lunr mode & mixed tokenizer");
      lunrLanguageSupport[maybePrimaryLanguageID as keyof typeof lunrLanguageSupport](lunr);
      enableLunrMultiLanguage(lunr);
      this.use((lunr as any).multiLanguage('en', maybePrimaryLanguageID));
      (this as any).tokenizer = function(x: any) {
        return lunr.tokenizer(x).concat((lunr as any)[maybePrimaryLanguageID].tokenizer(x));
      };
    }

    // Reduce the effect of document length on term importance.
    // this.b(0.3);
    // Do something about frequent words that are not in stop word filter.
    // this.k1(1.4);

    this.ref('name');
    this.field('body');

    let done = 0;
    const total = Object.keys(contentCache).length + Object.keys(resourceDescriptions).length;
    for (const [uri, content] of Object.entries(contentCache)) {
      done += 1;
      indexProgress({ state: `adding entry for ${uri}`, total, done });
      const label = content?.content?.labelInPlainText;
      if (label) {
        const entry: LunrIndexEntry = {
          name: uri,
          body: label,
        };
        this.add(entry);
      } else {
        console.warn("No label for", uri);
      }
    }
    for (const [uri, desc] of Object.entries(resourceDescriptions)) {
      done += 1;
      indexProgress({ state: 'adding entries for subresources', total, done });

      const lang = desc.primaryLanguageID;

      if (lang && lang !== maybePrimaryLanguageID && lang !== 'en' && lunr.hasOwnProperty(lang)) {
        console.warn("Resource language is different from primary language, this may not work");
        this.use((lunr as any).multiLanguage('en', lang));
      }

      const rels = reader.resolve(uri);
      const relationsExcludingReferences = rels.filter(([s, p, o]) =>
        p === 'hasPart'
        &&
        (s === ROOT_SUBJECT || s === uri)
        &&
        !o.startsWith('data:')
        &&
        (!isURIString(o) || !reader.exists(o))
      );
      const body = relationsExcludingReferences.map(([s, p, o]) => o).join('').trim();

      if (body) {
        //console.debug("Indexing", uri, relationsExcludingReferences, body);
        const entry: LunrIndexEntry = {
          name: uri,
          body,
        };
        this.add(entry);
      } else {
        //console.debug("Indexing", uri, 'no text');
      }
    }
  });
  indexProgress(null);
  yield { '/search-index.json': encoder.encode(JSON.stringify(lunrIndex, null, 4)) };
}


/** Emits blobs keyed by root-relative paths. */
export async function * generateStaticSiteAssets(
  versions: Record<string, VersionMeta>,
  currentVersionID: string,
  opts: Omit<GeneratorHelpers, 'reportNotice'> & {
    getConfigOverride: (forVersionID?: string) => Promise<BuildConfig | null>;
    pathPrefix?: string | undefined;
    debug?: { reactStrictMode?: boolean, reactDevTools?: boolean };
    //resolveConfig: (cfg: BuildConfig) => ResolvedBuildConfig;
  },
): AsyncGenerator<Record<string, Uint8Array>> {

  // Sort version IDs by timestamp, newer versions first.
  const versionIDsSorted = Array.from(Object.entries(versions)).
  toSorted(([, ver1], [, ver2]) =>
    ver2.timestamp.getTime() - ver1.timestamp.getTime()
  ).
  map(([vID, ]) => vID);

  const { cache, decodeXML, getDOMStub, fetchDependency, fetchBlob, getConfigOverride, getDependencyCSS, getDependencySource } = opts;

  if (!versions[currentVersionID]) {
    throw new Error("Version metadata is missing for the version set as current");
  }

  async function readConfig(atVersion?: string): Promise<BuildConfig> {
    return S.decodeUnknownSync(BuildConfigSchema)(
      JSON.parse(decoder.decode(await fetchBlob(
        'anafero-config.json',
        atVersion !== undefined ? { atVersion } : undefined,
      )))
    );
  }

  const [configProgress, ] = opts.reportProgress('check config override');

  const configOverride = await getConfigOverride();

  // Unless config file was explicitly overridden, we read it from source.
  // We start with a config for current version, since it must be specified;
  // when going through versions we will set it to each older version’s config,
  // until ancient versions that may not have config of their own, which will
  // use currentConfig left over from the oldest version that has one.
  // TODO: Rename build config to something more suitable
  let currentConfig: BuildConfig = configOverride ?? await readConfig(currentVersionID);

  configProgress(null);

  const baseVersioning = {
    versions,
    currentVersionID,
  };

  yield {
    '/versions.json': encoder.encode(JSON.stringify(baseVersioning, null, 4)),
  };

  const prefixWithTrailing = opts.pathPrefix
    ? `${opts.pathPrefix}/`
    : '/';
  function expandGlobalPath(
    path: string,
  ): string {
    const expanded = path.startsWith('/')
      ? `${opts.pathPrefix ?? ''}${path}`
      : `${prefixWithTrailing}${path}` ;
    //console.debug("Expanding path", JSON.stringify({ pp: opts.pathPrefix, prefixWithTrailing, path, expanded }, null, 2));
    return expanded;
  }


  // Things to inject in HTML

  const htmlAttrs = `
    ${opts.pathPrefix ? `data-path-prefix="${opts.pathPrefix}"` : ''}
    ${opts.debug?.reactStrictMode ? 'data-use-react-strict="true"' : ''}
  `;

  const globalCSS = ['bootstrap.css'].map(url =>
    `<link rel="stylesheet" href="${expandGlobalPath(url)}" />`
  ).join('\n');

  const head = `
    ${globalCSS}
    ${opts.debug?.reactDevTools ? '<script src="http://localhost:8097"></script>' : ''}
  `;

  const globalJS = ['bootstrap.js'].map(url =>
    `<script src="${expandGlobalPath(url)}"></script>`
  ).join('\n');


  for (const versionID of versionIDsSorted) {
    const [versionProgress, versionSubtask, versionNotice] =
      opts.reportProgress(`build version ${versionID}`);

    function fetchBlobAtThisVersion(objectPath: string) {
      return fetchBlob(objectPath, { atVersion: versionID });
    }

    const [versionConfigProgress, ] = versionSubtask('read version config');
    // Prefer in order:
    //   config override
    //     > config in given version tree
    //       > config in closest (newer) config-equipped version’s tree
    let cfg = (await getConfigOverride(versionID)) ?? configOverride;
    if (cfg === null) {
      try {
        cfg = await readConfig(versionID);
        // Update current config to this version’s,
        // if older versions are missing one then this one will be used.
        currentConfig = cfg;
      } catch (e) {
        // If there was no config available for this version, fall back to
        // most recently used config (i.e. the oldest version that has it)
        // and hope it works
        cfg = currentConfig;
      }
    }
    versionConfigProgress(null);

    const versionAssetGenerator = generateVersion(
      cfg,
      fetchBlobAtThisVersion,
      {
        getDOMStub,
        cache,
        decodeXML,
        fetchDependency,
        getDependencyCSS,
        getDependencySource,
        reportProgress: versionSubtask,
        reportNotice: versionNotice,
      },
      { htmlAttrs, head, tail: globalJS },
      function expandVersionedPath(versionRelativePath) {
        const isNonSlashPrepended = !versionRelativePath.startsWith('/');
        // TODO: Make callers specify paths consistently slash-prepended?
        if (isNonSlashPrepended) {
          console.warn("expandVersionedPath: got non-slash-prepended path");
        }
        const path = isNonSlashPrepended
          ? `/${versionRelativePath}`
          : versionRelativePath;
        const withVersion = versionID === currentVersionID
          ? path
          : `/${versionID}${path}`;
        const expanded = expandGlobalPath(withVersion);
        //console.debug("Expanding version-relative path", JSON.stringify({ versionRelativePath, withVersion, expanded }, null, 2));
        return expanded;
      },
    );

    const versionPathPrefix = versionID === currentVersionID ? '' : `/${versionID}`;

    yield {
      [`${versionPathPrefix}/active-version.json`]:
        encoder.encode(JSON.stringify({ versionID }, null, 4)),
    };

    for await (const blobChunk of versionAssetGenerator) {
      yield Object.entries(blobChunk).map(([subpath, blob]) => {
        const assetBlobPath = `${versionPathPrefix}${subpath}`;
        //console.debug("Outputting resource blob at path", path, subpath, assetBlobPath);
        return { [assetBlobPath]: blob };
      }).reduce((prev, curr) => ({ ...prev, ...curr }), {});
    }

    versionProgress(null);
  }
}

function relativeGraph(
  relations: RelationGraphAsList | Readonly<RelationGraphAsList>,
  subj: string,
): Readonly<RelationGraphAsList> {
  return relations.
    filter(([s, ]) => s !== ROOT_SUBJECT).
    map(([s, p, o]) => [s === subj ? ROOT_SUBJECT : s, p, o]);
}
