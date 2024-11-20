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

enableLunrStemmer(lunr);
enableTinyLunrSegmenter(lunr);
enableLunrFr(lunr);
enableLunrJa(lunr);
// End initialize search


import { type VersionMeta } from './versioning.mjs';
import {
  type BuildConfig,
  BuildConfigSchema,
  type DependencyResolver,
} from './Config.mjs';
import {
  type StoreAdapterModule,
  type ResourceRelation,
  type ResourceReader,
} from './ResourceReader.mjs';
import {
  type ContentAdapterModule,
  type ResourceContent,
  type AdapterGeneratedResourceContent,
  type ResourceMetadata,
  gatherDescribedResourcesFromJsonifiedProseMirrorNode,
  fillInLocale,
} from './ContentGenerator.mjs';
import {
  type RelationGraphAsList,
  dedupeGraph,
  dedupeResourceRelationList,
} from './relations.mjs';
import { type LayoutModule, type NavLink } from './Layout.mjs';
import { isURIString } from './URI.mjs';
import { BrowserBar } from 'firelight-gui/BrowseBar.jsx';
import { Resource, type ResourceProps } from 'firelight-gui/Resource.jsx';


const encoder = new TextEncoder();
const decoder = new TextDecoder();


const ROOT_SUBJECT = '_:root';


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
  relations: RelationGraphAsList,
  /** Graphs for parents, starting with nearest parent up. */
  parentChain: [path: string, uri: string, graph: RelationGraphAsList][],
  /** Graphs for descendants (probably in order). */
  directDescendants: [path: string, uri: string, graph: RelationGraphAsList][],
  resourceProps: Omit<ResourceProps, 'nav' | 'graph' | 'content' | 'document'>,
  getDOMStub: GeneratorHelpers['getDOMStub'],
  extraCSS: string,
  workspaceTitle: string,
  primaryLanguageID: string,

  /** Called to describe a related resource. */
  describe: (graph: RelationGraphAsList, uri: string) =>
    ResourceMetadata | null,
  /** Called to generate page content. */
  generateContent: (graph: RelationGraphAsList, uri: string) =>
    AdapterGeneratedResourceContent | null,
): Generator<Record<string, Uint8Array>> {

  yield {
    '/resource.json': encoder.encode(
      JSON.stringify(relations, null, 4),
    ),
  };

  const generatedContent = generateContent(relations, resourceURI);
  if (!generatedContent) {
    console.warn("Resource has no content", resourceURI);
    return;
  }
  yield {
    '/resource-content.json': encoder.encode(JSON.stringify(generatedContent, null, 4)),
  };

  const generateNavLink = function generateNavLink(
    path: string,
    uri: string,
    graph: RelationGraphAsList,
  ): NavLink {
    return {
      path,
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
  }));

  const helmet = Helmet.renderStatic();

  const htmlPage = `
    <!doctype html>
    <html ${helmet.htmlAttributes.toString()}
        data-initial-resource-id="${resourceURI}"
        data-workspace-title="${workspaceTitle}">
      <head>
        <meta charset="utf-8">
        <!-- devtools
        <script src="http://192.168.0.179:8097"></script> -->
        ${helmet.title.toString()}
        ${helmet.meta.toString()}
        ${helmet.link.toString()}
        ${extraCSS}
        <link rel="stylesheet" href="/bootstrap.css" />
      </head>
      <body ${helmet.bodyAttributes.toString()}>
        <div id="app">${browseBarHTML}<main id="resources">${resourceHTML}</main></div>
        <script src="/bootstrap.js"></script>
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
  { getDOMStub, fetchDependency, getDependencyCSS, getDependencySource, decodeXML }:
    Pick<GeneratorHelpers, 'getDOMStub' | 'fetchDependency' | 'getDependencySource' | 'getDependencyCSS' | 'decodeXML'>,
  expandPath: (versionRelativePath: string) => string,
): AsyncGenerator<Record<string, Uint8Array>> {

  // For every specified reader module, instantiate it in advance
  const storeAdapters =
    (await Promise.all(cfg.storeAdapters.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<StoreAdapterModule>(moduleRef) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const contentAdapters =
    (await Promise.all(cfg.contentAdapters.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<ContentAdapterModule>(moduleRef) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const layoutModules =
    (await Promise.all(cfg.resourceLayouts.map(async (moduleRef) =>
      ({ [moduleRef]: await fetchDependency<LayoutModule>(moduleRef) })
    ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const layouts = layoutModules[cfg.resourceLayouts[0]]!.layouts;
  const defaultLayout = layouts[0]!.layout;

  console.debug(
    "Using store adapters:",
    Object.values(storeAdapters).map(m => m.name).join(', '));

  console.debug(
    "Using content adapters:",
    Object.values(contentAdapters).map(m => m.name).join(', '));

  console.debug(
    "Using layouts:",
    Object.values(layoutModules).map(m => m.name).join(', '));

  if (!defaultLayout || cfg.storeAdapters.length < 1 || cfg.contentAdapters.length < 1) {
    throw new Error("Missing configuration: need at least one each module: layout, store adapter, content adapter");
  }

  // Emit this version’s dependency index
  /** Sorts dependency module ID by category. */
  const dependencyIndex = {
    storeAdapters: Object.keys(storeAdapters),
    contentAdapters: Object.keys(contentAdapters),
    layouts: cfg.resourceLayouts,
  } as const;
  yield {
    '/dependency-index.json': encoder.encode(JSON.stringify(dependencyIndex, null, 4)),
  };

  // Emit this version’s dependency sources
  const dependencySources: Record<string, string> = {};
  for (const modID of [...cfg.storeAdapters, ...cfg.contentAdapters, ...cfg.resourceLayouts]) {
    dependencySources[modID] = getDependencySource(modID);
  }
  yield {
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
  const dependencyHTMLHead = supportingCSSLinks.map(link =>
    `<link rel="stylesheet" href="${expandPath(link)}" />`
  ).join('\n')

  /** The first content adapter specified. */
  const contentAdapter = contentAdapters[cfg.contentAdapters[0]]!;

  /**
   * For now we only allow one content adapter.
   *
   * Technically, it should probably return the first content adapter
   * that finds any content-contributing relations, or null.
   */
  const findContentAdapter = function (
    relations: RelationGraphAsList,
  ): [string, ContentAdapterModule] | null {
    return [cfg.contentAdapters[0], contentAdapter];

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

  const reader = await makeContentReader(
    cfg.entryPoint,
    storeAdapters,
    contentAdapter.contributingToHierarchy ?? [],
    function contributesToHierarchy(relation, targetRelations) {
      return contentAdapter.contributesToHierarchy?.(relation, targetRelations) ?? null;
    },
    {
      fetchBlob: fetchBlobAtThisVersion,
      decodeXML,
    },
  );

  console.debug(
    "Initialized content reader with total paths:",
    reader.countPaths());

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

  const hierarchicalResources = reader.generatePaths();
  for await (const { path, resourceURI, parentChain, directDescendants } of hierarchicalResources) {
    console.debug("Got resource", resourceURI, path);

    if (path.startsWith('/')) {
      console.error("Hierarchy generated a slash-prepended path, this is not allowed");
      throw new Error("Malformed resource URL while processing resources: leading slash");
    }
    if (path.indexOf('#') >= 0) {
      console.error("Hierarchy generated a path with hash fragment, this is not allowed");
      throw new Error("Malformed resource URL while processing resources: hash fragment");
    }

    const relations = await reader.resolve(resourceURI);

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
        maybePrimaryLanguageID = resourceMeta.primaryLanguageID;
      }
    } else if (!resourceMeta.primaryLanguageID) {
      resourceMeta.primaryLanguageID = maybePrimaryLanguageID;
    }
    resourceDescriptions[resourceURI] = resourceMeta;

    // Process resources on the page
    for (const [, , o] of relations) {
      if (o.startsWith('file:')) {
        // Some resource on the page is referencing a file.
        const filePath = o.split('file:')[1]!;
        const filename = encodeURIComponent(filePath);
        // Unless it was seen before, add to assets and resource map.
        // encodeURIComponent should preserve original filename extension.
        if (!assetsToWrite[filename]) {
          assetsToWrite[filename] = await fetchBlobAtThisVersion(filePath);
          resourceGraph.push([resourceURI, 'isDownloadableAt', filename]);
          resourceMap[filename] = o;
          resourceDescriptions[o] = {
            labelInPlainText: filePath,
          };
        }
      }
    }

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
        locateResource: (uri) => expandPath(reader.findURL(uri)),
      },
      getDOMStub,
      dependencyHTMLHead,
      maybeMainTitle ?? 'Workspace',
      resourceMeta.primaryLanguageID ?? maybePrimaryLanguageID ?? 'en',
      function describe(relations) {
        const maybeAdapter = findContentAdapter(relations);
        return maybeAdapter ? maybeAdapter[1].describe(relations) : null;
      },
      function generateContent(relations, uri: string) {
        if (!contentCache[uri]) {
          let content: ResourceContent | null;
          //console.debug("Generating resource content from relations", resourceURI, maybePrimaryLanguageID);
          const maybeAdapter = findContentAdapter(relations);
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
            };
            if (content) {
              // Add sub-resources described by the page
              // to resource map/graph
              const describedResourceIDs =
                gatherDescribedResourcesFromJsonifiedProseMirrorNode(content.contentDoc);
              for (const inPageResourceID of describedResourceIDs) {
                // We have a sub-resource represented by the page.
                // Add it to resource map, too (with hash fragment).
                const pathWithFragment = `${path}#${encodeURIComponent(inPageResourceID)}`;
                resourceMap[pathWithFragment] = inPageResourceID;
                resourceGraph.push([inPageResourceID, 'isDefinedBy', `${path}/resource.json`]);
                resourceDescriptions[inPageResourceID] = {
                  primaryLanguageID: maybePrimaryLanguageID,
                  ...contentAdapter.describe(relativeGraph(relations, inPageResourceID)),
                };
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
      for (const [subpath, blob] of Object.entries(blobChunk)) {
        const assetBlobPath = `/${path}${subpath}`;
        //console.debug("Outputting resource blob at path", path, subpath, assetBlobPath);
        yield { [assetBlobPath]: blob };
      }
    }
  }

  for (const [filename, blob] of Object.entries(assetsToWrite)) {
    yield { [`/${filename}`]: blob };
  }

  yield { '/resource-map.json': encoder.encode(JSON.stringify(resourceMap, null, 4)) };
  yield { '/resource-graph.json': encoder.encode(JSON.stringify(resourceGraph, null, 4)) };

  yield { '/resource-descriptions.json': encoder.encode(JSON.stringify(resourceDescriptions, null, 4)) };

  const lunrIndex = lunr(function () {
    this.ref('name');
    this.field('body');
    for (const [uri, content] of Object.entries(contentCache)) {
      const lang = resourceDescriptions[uri]?.primaryLanguageID ?? maybePrimaryLanguageID;
      if (lang && lunr.hasOwnProperty(lang)) {
        this.use((lunr as any)[lang]);
      }
      if (content?.content) {
        const { contentDoc, labelInPlainText } = content.content;
        const entry: LunrIndexEntry = {
          name: uri,
          body: `${labelInPlainText} — ${gatherTextFromJsonifiedProseMirrorNode(contentDoc)}`,
        }
        this.add(entry);
      }
    }
  });
  yield { '/search-index.json': encoder.encode(JSON.stringify(lunrIndex, null, 4)) };
}


/**
 * Useful for search indexing.
 *
 * This should not be used, in favor of something more proper such as:
 *
 *  const transformer = new Transform(node)
 *  const content = transformer.doc.textContent.toString()
 *
 * (The latest versions of ProseMirror may have an even easier version.)
 *
 * However, since we return .toJSON()’ed representation of the doc for now
 * from content adapter, we have no choice.
 */
function gatherTextFromJsonifiedProseMirrorNode(jsonifiedNode: any): string {
  if (jsonifiedNode?.type === 'text') {
    return typeof jsonifiedNode.text === 'string'
      ? (jsonifiedNode.text ?? "")
      : "";
  } else {
    if (Array.isArray(jsonifiedNode?.content) && jsonifiedNode.content.length > 0) {
      return jsonifiedNode.content.
        map(gatherTextFromJsonifiedProseMirrorNode).
        join("\n");
    } else {
      return "";
    }
  }
}


/** Emits blobs keyed by root-relative paths. */
export async function * generateStaticSiteAssets(
  versions: Record<string, VersionMeta>,
  currentVersionID: string,
  opts: GeneratorHelpers & {
    getConfigOverride: (forVersionID?: string) => Promise<BuildConfig | null>;
    //resolveConfig: (cfg: BuildConfig) => ResolvedBuildConfig;
  },
): AsyncGenerator<Record<string, Uint8Array>> {

  // Sort version IDs by timestamp, newer versions first.
  const versionIDsSorted = Array.from(Object.entries(versions)).
  toSorted(([, ver1], [, ver2]) =>
    ver2.timestamp.getTime() - ver1.timestamp.getTime()
  ).
  map(([vID, ]) => vID);

  const { decodeXML, getDOMStub, fetchDependency, fetchBlob, getConfigOverride, getDependencyCSS, getDependencySource } = opts;

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

  const configOverride = await getConfigOverride();

  // Unless config file was explicitly overridden, we read it from source.
  // We start with a config for current version, since it must be specified;
  // when going through versions we will set it to each older version’s config,
  // until ancient versions that may not have config of their own, which will
  // use currentConfig left over from the oldest version that has one.
  // TODO: Rename build config to something more suitable
  let currentConfig: BuildConfig = configOverride ?? await readConfig(currentVersionID);

  const baseVersioning = {
    versions,
    currentVersionID,
  };

  yield {
    '/versions.json': encoder.encode(JSON.stringify(baseVersioning, null, 4)),
  };

  for (const versionID of versionIDsSorted) {

    function fetchBlobAtThisVersion(objectPath: string) {
      return fetchBlob(objectPath, { atVersion: versionID });
    }

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

    const versionAssetGenerator = generateVersion(
      cfg,
      fetchBlobAtThisVersion,
      {
        getDOMStub,
        decodeXML,
        fetchDependency,
        getDependencyCSS,
        getDependencySource,
      },
      function expandPath(versionRelativePath) {
        return versionID === currentVersionID
          ? versionRelativePath
          : `/${versionID}${versionRelativePath}`;
      },
    );

    const versionPathPrefix = versionID === currentVersionID ? '' : `/${versionID}`;

    yield {
      [`${versionPathPrefix}/active-version.json`]:
        encoder.encode(JSON.stringify({ versionID }, null, 4)),
    };

    for await (const blobChunk of versionAssetGenerator) {
      for (const [subpath, blob] of Object.entries(blobChunk)) {
        const assetBlobPath = `${versionPathPrefix}${subpath}`;
        //console.debug("Outputting resource blob at path", path, subpath, assetBlobPath);
        yield { [assetBlobPath]: blob };
      }
    }
  }
}

interface ContentReader {
  resolve: (resourceURI: string) => Promise<RelationGraphAsList>;
  generatePaths: (fromSubpath?: string) => AsyncGenerator<{
    /** Path with leading but no trailing slash. Empty string for root. */
    path: string;
    /**
     * URI identifying a resource.
     * A file: URI means there was no reader that could resolve it,
     * and it is expected to be emitted under that path
     */
    resourceURI: string;
    parentChain: [path: string, uri: string, graph: RelationGraphAsList][];
    directDescendants: [path: string, uri: string, graph: RelationGraphAsList][];
  }>;
  findURL: (resourceURI: string) => string;
  countPaths: () => number;
  //traverseHierarchy: (subpath?: string) => AsyncGenerator<ResourceWithRelations>,
}

/**
 * Generates resources and their hierarchy and allows to resolve
 * relations recursively.
 */
async function makeContentReader(
  entryPointURI: string,
  storeAdapters: Record<string, StoreAdapterModule>,
  hierarchyContributingRelations: string[][],
  /** Whether content adapter thinks this should contribute to hierarchy. */
  contributesToHierarchy: (
    relation: ResourceRelation,
    targetRelations: RelationGraphAsList,
  ) => null | string | string[][],
  // /** Whether content adapter thinks this should contribute to content. */
  //relationContributesToContent: (relation: ResourceRelation) => boolean,
  { fetchBlob, decodeXML }: Pick<GeneratorHelpers, 'fetchBlob' | 'decodeXML'>,
): Promise<ContentReader> {

  const readerHelpers = { fetchBlob, decodeXML } as const;

  function findStoreAdapter(resourceURI: string): StoreAdapterModule | null {
    for (const [, adapter] of Object.entries(storeAdapters)) {
      if (adapter.canResolve(resourceURI)) {
        return adapter;
      }
    }
    return null;
  }

  // Each entry point has a reader, and since we obtain initial root relations
  // after initializing a reader we’ll cache those too.
  interface CachedReader {
    reader: ResourceReader;
    entryPointURI: string;
  }
  const entryPointReaders: Record<string, CachedReader> = {};
  function findReaderWithResource(resourceURI: string): CachedReader | null {
    // If resourceURI is an entry point, return that reader straight away.
    // If resourceURI is empty, assume main entry point URI.
    if (entryPointReaders[resourceURI || entryPointURI]) {
      return entryPointReaders[resourceURI || entryPointURI] ?? null;
    }
    // Otherwise, go through readers and see which has the resource.
    for (const [entryPointURI, { reader }] of Object.entries(entryPointReaders)) {
      if (reader.resourceExists(resourceURI)) {
        return { reader, entryPointURI };
      }
    }
    console.warn("Could not find reader for resource", resourceURI);
    return null;
  }

  // Initialization

  const pathsByResourceURI: { [resourceURI: string]: string } = {
    '': '',
    [entryPointURI]: '',
  };
  const resourceURIsByPath: { [path: string]: string } = {
    // Root
    '': '',
  };
  const immediateRelations: { [resourceURI: string]: ResourceRelation[] } = {};
  let totalPaths = 0;
  for await (const [path, resourceURI, relations] of generateHierarchy(entryPointURI, '')) {
    console.debug("Generating hierarchical resource", path, resourceURI);
    pathsByResourceURI[resourceURI] = path;
    immediateRelations[resourceURI] = relations;
    resourceURIsByPath[path] = resourceURI;
    totalPaths += 1;
  }

  // Utils

  function findChildren(
    /** Prefix without trailing slash, with leading slash. Empty string for root. */
    prefix: string,
  ): { [path: string]: string } {
    // The logic was more elegant when root was assumed to be a slash,
    // rather than empty string…
    const results =  Object.entries(resourceURIsByPath).
      filter(([p, ]) =>
        p !== prefix && (!prefix || p.startsWith(`${prefix}/`)) && p.length > prefix.length).
      map(([p, uri]) => [
        (!prefix ? p : p.replace(`${prefix}/`, '')).split('/')[0],
        uri,
      ] as [string, string]).
      filter(([p, ]) => p !== undefined);
    const children = Object.fromEntries(
      results.map(([p, uri]) =>
        [!prefix ? `/${p}` : `/${prefix}/${p}`, resourceURIsByPath[!prefix ? p : `${prefix}/${p}`]] as [string, string]));
    return children
  }

  function findParents(
    /** Path with leading, without trailing slash. */
    child: string,
  ): [path: string, resourceURI: string][] {
    const parts = child.split('/');
    const partsWithoutChild = parts.slice(0, parts.length - 1);
    const parentPaths = partsWithoutChild.map((c, idx) =>
      `${partsWithoutChild.slice(0, idx + 1).join('/')}`
    );
    parentPaths.reverse();
    return parentPaths.map(p => [`/${p}`, resourceURIsByPath[p]!]);
  }

  async function resolveResourceGraph(
    resourceURI: string,
    graphSoFar?: RelationGraphAsList,
    rootResourceURI?: string,
  ): Promise<RelationGraphAsList> {
    const graph = graphSoFar ?? [];
    const root = rootResourceURI ?? resourceURI;
    const maybeReader = findReaderWithResource(resourceURI);
    if (maybeReader) {
      const { reader, entryPointURI } = maybeReader;
      const relations: ResourceRelation[] = [];
      if (immediateRelations[resourceURI] !== undefined) {
        relations.push(...immediateRelations[resourceURI]);
      } else {
        const root = resourceURI === entryPointURI ? '' : resourceURI;
        for await (const rel of reader.resolveRelations(root)) {
          relations.push(rel);
        }
      }
      const newGraph =  [...graph ];
      // NOTE: Process in sequence, we for now preserve ordering
      // and Promise.all might mess that up.
      for (const rel of relations) {
        const targetIsAFile = rel.target.startsWith('file:');
        newGraph.push([
          resourceURI,
          rel.predicate,
          // For targets that reference files,
          // expand them to full paths based on entry point’s URI
          // (which would have to be using file:, too)
          rel.target.startsWith('file:')
            ? expandFileURI(entryPointURI, rel.target)
            : rel.target,
        ]);
        const referencesResource = !targetIsAFile && isURIString(rel.target);
        const isInHierarchy = referencesResource && pathsByResourceURI[rel.target];
        // We don’t resolve target’s subgraph if it references
        // a resource already in page hierarchy.
        // In case of isInHierarchy we may still resolve just one more level?
        if (referencesResource && !isInHierarchy) {
          if (rel.target === resourceURI) {
            continue;
          }
          newGraph.push(
            ...(await resolveResourceGraph(rel.target, graph, root)),
          );
        }
      }
      // Replace references to root with _:root
      return dedupeGraph(newGraph).
        map(([s, p, o]) => [s === root ? '_:root' : s, p, o]);
    }
    return graph;
  }


  // API

  return {
    countPaths: function countPaths() {
      return totalPaths;
    },
    findURL: function findResourceURL(resourceURI) {
      return pathsByResourceURI[resourceURI]!;
    },
    generatePaths: async function * generatePaths() {
      for (const [path, resourceURI] of Object.entries(resourceURIsByPath)) {
        const p = {
          path,
          resourceURI,
          directDescendants: await Promise.all(
            Object.entries(findChildren(path)).
            map(async ([path, res]) => {
              return [
                path,
                res,
                await resolveResourceGraph(res),
              ] as [string, string, RelationGraphAsList];
            })
          ),
          parentChain: await Promise.all(
            [...findParents(path), ['/', ''] as [string, string]].
            map(async ([path, res]) => {
              return [
                path,
                res,
                await resolveResourceGraph(path === '/' ? '' : res),
              ] as [string, string, RelationGraphAsList];
            })
          ),
        };
        //console.debug("generating path", path, resourceURI, p);
        yield p;
      }
    },
    resolve: async function resolveGraph(resourceURI) {
      //console.debug("from resolveGraph: ", resourceURI);
      return await resolveResourceGraph(resourceURI);
    },
  };

  /**
   * Given two `file:` URIs a base and part, makes a new one where
   * part is joined with base, unless part starts with slash in which
   * case it’s returned as is.
   *
   * Guarantees to return a `file:` URI or throw.
   */
  function expandFileURI(baseFileURI: string, fileURI: string): string {
    const baseFilePath = baseFileURI.startsWith('file:')
      ? baseFileURI.split('file:')[1]
      : undefined;
    if (!baseFilePath) {
      throw new Error("Trying to expand a file: URI, but respective entry point is not using that scheme");
    }
    const filePath = fileURI.split('file:')[1]!;
    const dirname = baseFilePath.indexOf('/') >= 1
      ? baseFilePath.slice(0, baseFilePath.lastIndexOf('/'))
      : '';
    return filePath.startsWith('/')
      ? fileURI
      // ^ Treat given fileURI as root-relative
      : `file:${dirname}${dirname ? '/' : ''}${filePath}`
      // ^ Join dirname of base path with apparently relative file path
  }

  /**
   * Resolve a list of chains using the logic in
   * resolveChainToValue(). Returns the result of the first
   * successful chain (that returned not a null).
   */
  async function resolveChainsToValue(
    resourceURI: string,
    relationChains: string[][],
  ): Promise<string | null> {
    for (const chain of relationChains) {
      const maybeValue = await resolveChainToValue(resourceURI, chain);
      if (maybeValue) {
        return maybeValue;
      }
    }
    return null;
  }

  /**
   * Resolves a relation chain. E.g., if you provide
   * [hasPart, hasClauseIdentifier]
   * it would check if resourceURI hasPart relation,
   * and related object also hasClauseIdentifier,
   * and if yes then it would return that hasClauseIdentifier’s value.
   * Otherwise, it would return null.
   */
  async function resolveChainToValue(
    resourceURI: string,
    relationChain: string[],
  ): Promise<string | null> {
    if (relationChain.length < 1) {
      return null;
    }
    const reader = entryPointReaders[resourceURI]?.reader
      ?? findReaderWithResource(resourceURI)?.reader;
    if (!reader) {
      return null;
    }
    const isEntryPointReader = entryPointReaders[resourceURI] !== undefined;
    const targets = await reader.resolveRelation(
      isEntryPointReader ? '' : resourceURI,
      relationChain[0]!,
    );
    // Try every value
    for (const target of targets) {
      if (isURIString(target)) {
        // Value points to an object, let’s recurse into it
        const result = await resolveChainToValue(target, relationChain.slice(1));
        if (result) {
          return result;
        }
      } else if (relationChain.length === 1) {
        // Value is a string and we’ve reached the last relation component,
        // return the value.
        return target;
      }
    }
    return null;
  }

  async function _contributesToHierarchy(relation: ResourceRelation):
  Promise<string | null> {
    if (!isURIString(relation.target)) {
      return null;
    } else {
      // New path component to append for this relation
      let pathComponent: string | null = null;

      // Among contributing chains, find any starting with current predicate
      // and cut the current predicate off the start of each.
      const maybeContributingRelations = hierarchyContributingRelations.
        filter(r => r[0] === relation.predicate).
        map(r => r.slice(1));
      if (maybeContributingRelations.length > 0) {
        // Resolve chains that start with this relation’s predicate 
        // relative to resource being considered
        const maybePathComponent = await resolveChainsToValue(
          relation.target,
          maybeContributingRelations,
        );
        //console.debug("Checking for hierarchy", relation, maybePathComponent);
        if (maybePathComponent) {
          pathComponent = maybePathComponent;
        }
      } else {
        // Use more complicated logic.
        // TODO: Fix or remove contributesToHierarchy()
        const targetGraph: RelationGraphAsList = [];
        const maybeReader = findReaderWithResource(relation.target)
        if (maybeReader) {
          const { reader, entryPointURI } = maybeReader;
          const root = entryPointURI === relation.target ? '' : relation.target;
          for await (const targetRelation of reader.resolveRelations(root)) {
            targetGraph.push(['_:root', targetRelation.predicate, targetRelation.target]);
          }
        }
        const maybePropertyOrChains = contributesToHierarchy(
          relation,
          dedupeGraph(targetGraph),
        );
        if (maybePropertyOrChains) {
          const maybePathComponent = typeof maybePropertyOrChains === 'string'
            ? maybePropertyOrChains
            : await resolveChainsToValue(
                // Resolve these chains relative to relation target,
                // since relation target is implied
                relation.target,
                maybePropertyOrChains,
              );
          if (maybePathComponent) {
            pathComponent = maybePathComponent;
          }
        }
      }

      return pathComponent;
    }
  }

  // It is implied that starting resource URI generated hierarchy,
  // so we start from its direct relations and down.

  async function * generateHierarchy(
    resourceURI: string,
    /**
     * Root-relative prefix, no trailing slash.
     * Emptry string for root entry.
     */
    urlPrefix: string,
    /**
     * The current entry point.
     * If a new blob reader is created, its entry point URI
     * will be computed relative to this.
     */
    entryPointURI?: string,
  ):
  AsyncGenerator<[
    /** Root-relative path with leading slash but no trailing slash. */
    path: string,
    resourceURI: string,
    relations: ResourceRelation[],
  ]> {
    // Try any of the preexisting readers, if any report existing resource
    // then resolve through that.
    //
    // NOTE: If resource URI resolves via another entry point, we must have
    // seen that entry point already or we cannot resolve the resource.
    const maybeReader = findReaderWithResource(resourceURI);
    const relations: ResourceRelation[] = [];
    let currentEntryPointURI: string;
    if (maybeReader) {
      const { reader, entryPointURI } = maybeReader;
      currentEntryPointURI = entryPointURI;
      //url = `${urlPrefix}${reader.toURL(resourceURI)}`;
      //const relations = yield * reader.resolveRelations(resourceURI);
      const root = entryPointURI === resourceURI ? '' : resourceURI;
      for await (const relation of reader.resolveRelations(root, 1)) {
        relations.push(relation);
      }
    } else {
      const [newCurrentEntryPointURI, relations_] =
        await startReader(resourceURI, entryPointURI);
      currentEntryPointURI = newCurrentEntryPointURI;
      for (const rel of relations_) {
        relations.push(rel);
      }
    }
    if (!relations.find(({ predicate }) => predicate === 'type')) {
      console.warn("Resource in hierarchy lacks a type", resourceURI, urlPrefix);
    }

    yield [urlPrefix, resourceURI, relations];

    for (const relation of dedupeResourceRelationList(relations)) {
      let pathComponent = await _contributesToHierarchy(relation);
      if (!pathComponent && relation.target.startsWith('file:')) {
        try {
          const [newCurrentEntryPointURI, ] =
            await startReader(relation.target, entryPointURI);
          currentEntryPointURI = newCurrentEntryPointURI;
          pathComponent = await _contributesToHierarchy(relation);
        } catch (e) {
          console.error("Error starting reader for entry point", relation.target, e);
          continue;
        }
      }

      if (pathComponent) {
        if (pathComponent && isValidPathComponent(pathComponent)) {
          const encodedComponent = pathComponent.replace(':', '_');
          const newPath = urlPrefix
            ? `${urlPrefix}/${encodedComponent}` : encodedComponent;
          yield * generateHierarchy(
            relation.target,
            newPath,
            currentEntryPointURI,
          );
        }
      }
    }
  }

  async function startReader(resourceURI: string, entryPointURI?: string) {
    console.debug("Starting a new reader for", resourceURI, "from", entryPointURI);

    // Otherwise obtain a new reader using resource URI as entry point.
    // We only support blob readers & local file: URIs for entry points now.
    const isFileURI = resourceURI.startsWith('file:');
    if (!isFileURI) {
      console.error("Hierarchy item points to a non-file URI, but only blob readers are supported for now", resourceURI);
      throw new Error("Hierarchy item points to a non-file URI, but only blob readers are supported for now");
    }
    // Expand entry point URI relative to current entry point
    const fullFileURI = entryPointURI !== undefined
      ? expandFileURI(entryPointURI, resourceURI)
      : resourceURI;
    const localFilePath = fullFileURI.split('file:')[1]!;
    const storeAdapter = findStoreAdapter(fullFileURI);
    if (!storeAdapter || !storeAdapter.readerFromBlob) {
      console.error("Unable to locate a blob reader for entry point with file URI", resourceURI);
      throw new Error("Unable to locate a blob reader for entry point with file URI");
    }
    if (!entryPointReaders[fullFileURI]) {
      // Resource URI is an entry point that we have not seen yet
      console.debug("Starting a reader for entry path", fullFileURI, "expanded from", resourceURI);
      const entryPointBlob = await fetchBlob(localFilePath);
      const [relations_, reader] = await storeAdapter.readerFromBlob(
        entryPointBlob,
        readerHelpers);
      entryPointReaders[fullFileURI] = { reader, entryPointURI: fullFileURI };
      immediateRelations[fullFileURI] = relations_;

      return [fullFileURI, relations_] as [string, ResourceRelation[]];
    } else {
      console.error("Won’t start a new reader for entry point that already has a reader", resourceURI, fullFileURI);
      throw new Error("Won’t start a new reader for entry point that already has a reader");
    }
  }
}


function isValidPathComponent(val: string): boolean {
  return val.indexOf('/') < 0;
}


function relativeGraph(
  relations: RelationGraphAsList | Readonly<RelationGraphAsList>,
  subj: string,
): Readonly<RelationGraphAsList> {
  return relations.
    filter(([s, ]) => s !== ROOT_SUBJECT).
    map(([s, p, o]) => [s === subj ? ROOT_SUBJECT : s, p, o]);
}
