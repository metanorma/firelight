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
  type RelationTriple,
  type RelationGraphAsList,
} from './relations.mjs';
import { type LayoutModule, type NavLink } from './Layout.mjs';
import { BrowserBar } from 'anafero-gui/BrowseBar.jsx';
import { Resource, type ResourceProps } from 'anafero-gui/Resource.jsx';
import {
  type TaskProgressCallback,
  type TaskNoticeCallback,
} from './progress.mjs';

import { makeContentReader } from './ContentReader.mjs';
import { type Cache } from './cache.mjs';
import {
  preprocessStringForIndexing,
  extractRelationsForIndexing,
} from './search.mjs';


const encoder = new TextEncoder();
const decoder = new TextDecoder();


interface LunrIndexEntry {
  name: string;
  title: string;
  body: string;
  lang: string;
}


/**
 * A collection of functions that handle environment-specific aspects.
 * E.g., in CLI `fetchBlob()` might read from disk, while in a worker
 * it might read from an IndexedDB.
 */
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
 * Emits assets for a particular resource (HTML, JSON, any supporting files)
 * as blobs keyed by resource-relative paths.
 */
export function * generateResourceAssets(
  resourceURI: string,
  relations: Readonly<RelationGraphAsList>,
  /** Graphs for parents, starting with nearest parent up. */
  parentChain: [path: string, uri: string, graph: ResourceMetadata][],
  /** Graphs for descendants (probably in order). */
  directDescendants: [path: string, uri: string, graph: ResourceMetadata][],
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

  /** Called to generate page content. */
  generatedContent: AdapterGeneratedResourceContent,
): Generator<Record<string, Uint8Array>> {

  const generateNavLink = function generateNavLink(
    path: string,
    uri: string,
    meta: ResourceMetadata,
  ): NavLink {
    return {
      path: expandVersionedPath(path),
      plainTitle: meta?.labelInPlainText ?? uri,
    };
  };
  const resourceNav: { breadcrumbs: NavLink[], children: NavLink[] } = {
    breadcrumbs: parentChain.map(([path, uri, meta]) =>
      generateNavLink(path, uri, meta)),
    children: directDescendants.map(([path, uri, meta]) =>
      generateNavLink(path, uri, meta)),
  };

  yield {
    '/resource.json': encoder.encode(JSON.stringify(relations, null, 4)),
    '/resource-content.json': encoder.encode(JSON.stringify(generatedContent, null, 4)),
    '/resource-nav.json': encoder.encode(JSON.stringify(resourceNav, null, 4)),
  };

  // This should carefully match the way resource is rendered client-side
  // to avoid discrepancies and shifts during hydration
  // (other than specific complex node widgets that require JS,
  // it should not change once JS runs).
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


// NOTE: Below func generates a version, but it shouldn’t be a concern
// Mentions of “version” can be removed and it should still make sense
/**
 * This function is probably the most involved
 * and is responsible for taking a build config,
 * reading resources, converting them to hierarchy of content.
 *
 * Emits blobs for physical assets (HTML, JSON, etc.)
 * keyed by filename relative to content root.
 */
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
  Store adapters: ${Object.values(storeAdapters).map(m => `${m.name}:${m.version}`).join(', ')}
  Content adapters: ${Object.values(contentAdapters).map(m => `${m.name}:${m.version}`).join(', ')}
  Layouts: ${Object.values(layoutModules).map(m => `${m.name}:${m.version}`).join(', ')}
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

  /** Resources to be added to search index. */
  const searchableResources:
  { pages: Record<string, LunrIndexEntry>, resources: Record<string, LunrIndexEntry> } =
  { pages: {}, resources: {} };


  // TODO: Combine resourceGraph and resourceDescriptions.
  // They serve a similar purpose.

  /** Basic resource descriptions keyed by resource URI. */
  const resourceDescriptions: Record<string, ResourceMetadata> = {};

  /** Maps filenames to blobs. Assets are global per version. */
  const assetsToWrite: Record<string, Uint8Array> = {};

  const rootMeta = reader.describeRoot();

  const maybePrimaryLanguageID = rootMeta.primaryLanguageID ?? 'en';

  const maybeMainTitle = rootMeta.labelInPlainText ?? "Document";

  // TODO: Implicitly including English is not good?
  const allLanguages: Set<string> = new Set(['en']);

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
  for (const { path, resourceURI, meta, graph, parentChain, directDescendants } of hierarchicalResources) {
    //console.debug("Got resource", resourceURI, path);

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

    const resourceMeta = meta;

    const relations = graph;

    pathProgress({ state: 'generating resource page content' });

    // TODO: Incorporate this with ContentReader nicely
    const content = (function generateContent(
      uri,

      /**
       * Resource metadata.
       * Technically, adapter-generated resource content will have metadata
       * (since it extends the metadata structure), but metadata gathered
       * through resource reader layer will have inherited parts
       * (e.g., language). See TODO at `ContentAdapterModule` for supporting
       * inheritance in adapter output.
       */
      metadata,

      /** Full resource graph. */
      graph,
    ): AdapterGeneratedResourceContent | null {
      let result: AdapterGeneratedResourceContent | null;

      let content: ResourceContent | null;
      //console.debug("Generating resource content from graph", resourceURI, maybePrimaryLanguageID);
      const maybeAdapter = findContentAdapter(uri);
      if (maybeAdapter) {
        try {
          content = maybeAdapter[1].generateContent(graph) ?? null;
        } catch (e) {
          console.error("Failed to generate resource content",
            path,
            uri,
            graph.slice(0, 40).join("\n"),
          );
          throw e;
        }

        if (content) {
          result = {
            adapterID: maybeAdapter[0],
            content: { ...metadata, ...content },
          } as const;

        } else {
          console.warn("No content was generated", uri);
          result = null;
        }
      } else {
        console.warn("No adapter found to render", uri);
        result = null;
      }
      return result;
    })(
      resourceURI,
      meta,
      relations,
    );

    pathProgress({ state: 'updating artifacts' });

    if (content?.content) {

      // Note the language

      if (meta.primaryLanguageID) {
        allLanguages.add(meta.primaryLanguageID);
      }


      // Process paged resource

      pathProgress({ state: 'indexing page resource' });

      const describedResourceIDs =
        gatherDescribedResourcesFromJsonifiedProseMirrorNode(
          content.content.contentDoc
        );

      // TODO: Delegate to content adapter
      function isIndexable(rel: RelationTriple<any, any>): boolean {
        return rel[1] === 'hasPart';
      }

      /**
       * Returns true if subject is defined on the page
       * and therefore should not be indexed as part of its parent.
       */
      function isIndexed (uri: string) {
        return reader.exists(uri) && describedResourceIDs.has(uri);
      }

      resourceMap[path] = resourceURI;
      resourceGraph.push([
        resourceURI,
        'isDefinedBy',
        `${path}/resource.json`,
      ]);
      resourceDescriptions[resourceURI] = resourceMeta;
      searchableResources.pages[resourceURI] = {
        name: resourceURI,
        title: preprocessStringForIndexing(meta.labelInPlainText),
        lang: meta.primaryLanguageID || '',
        body:
          preprocessStringForIndexing(
            extractRelationsForIndexing(
              resourceURI,
              relations,
              isIndexable,
              isIndexed,
            ).
            join('\n').
            trim()
          ),
      };


      // Process resources on the page
      //
      // NOTE: We process generated content, not resource graph,
      // because we can’t yet guarantee that all resources in the graph
      // are rendered in content

      pathProgress({ state: 'indexing on-page subresources' });

      for (const inPageResourceID of describedResourceIDs) {
        if (reader.exists(inPageResourceID)) {
          // We have a sub-resource represented by the page.
          // Add it to resource map, too (with hash fragment).
          const pathWithFragment = `${path}#${encodeURIComponent(inPageResourceID)}`;
          const meta = reader.describe(inPageResourceID);
          const graph = reader.resolve(inPageResourceID);
          resourceMap[pathWithFragment] = inPageResourceID;
          resourceGraph.push([
            inPageResourceID,
            'isDefinedBy',
            `${path}/resource.json`,
          ]);
          resourceDescriptions[inPageResourceID] = meta;
          if (inPageResourceID !== resourceURI) {
            const body = preprocessStringForIndexing(
              extractRelationsForIndexing(
                inPageResourceID,
                graph,
                isIndexable,
                isIndexed,
              ).
              join('\n').
              trim()
            );
            searchableResources.resources[inPageResourceID] = {
              name: inPageResourceID,
              title: preprocessStringForIndexing(meta.labelInPlainText),
              lang: meta.primaryLanguageID || '',
              body,
            };
          }
        } else {
          console.warn(
            "Subresource on page does not exist in the graph",
            path,
            inPageResourceID,
          );
        }
      }


      // Process assets referenced the page to output later

      pathProgress({ state: 'indexing referenced assets' });

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

      // Output resource assets (HTML, etc.) now

      pathProgress({ state: 'outputting assets' });

      const resourceAssetGenerator = generateResourceAssets(
        resourceURI,
        relations,
        parentChain,
        directDescendants,
        {
          useDependency: getDependency,
          selectedLayout: layouts[0]!,
          getResourcePlainTitle: (uri) =>
            resourceDescriptions[uri]?.labelInPlainText ?? uri,
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
        maybeMainTitle,
        resourceMeta.primaryLanguageID ?? maybePrimaryLanguageID,
        content,
      );

      for (const blobChunk of resourceAssetGenerator) {
        yield Object.entries(blobChunk).map(([subpath, blob]) => {
          const assetBlobPath = `/${path}${subpath}`;
          //console.debug("Outputting resource blob at path", path, subpath, assetBlobPath);
          return { [assetBlobPath]: blob };
        }).reduce((prev, curr) => ({ ...prev, ...curr }));
      }
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

  const supportedLanguages: string[] = [...allLanguages].
  filter(lang => lang === 'en' || !!lunrLanguageSupport[lang as keyof typeof lunrLanguageSupport]);

  console.debug(`Search index: primary language is “${maybePrimaryLanguageID}”, enabling ${supportedLanguages.join(', ')}`);

  const nonDefaultLanguages =
    supportedLanguages.filter(lang => lang !== 'en');

  if (supportedLanguages.length > 1) {
    for (const lang of nonDefaultLanguages) {
      lunrLanguageSupport[lang as keyof typeof lunrLanguageSupport](lunr);
    }
    enableLunrMultiLanguage(lunr);
  }

  const lunrIndex = lunr(function () {
    if (supportedLanguages.length > 1) {
      this.use((lunr as any).multiLanguage(...['en', ...nonDefaultLanguages]));

      console.debug(
        "Search index: enabling multi-language Lunr mode & mixed tokenizer",
        supportedLanguages.join(', '),
      );

      //(this as any).tokenizer = function(x: any) {
      //  return lunr.tokenizer(x).
      //  concat(...nonDefaultLanguages.map(lang => (lunr as any)[lang].tokenizer(x)));
      //};

      const lunrTokenizer = lunr.tokenizer;

      (this as any).tokenizer = function anaferoTokenizer(x: any) {
        // Combine default English Lunr tokens with tokens obtained
        // from first language-specific tokenizer, deduplicating them
        const baseLunrTokens = lunrTokenizer(x);
        const tokens = [...baseLunrTokens];
        for (const lang of nonDefaultLanguages) {
          const tokenizer = (lunr as any)[lang].tokenizer;
          if (tokenizer) {
            const langTokens: lunr.Token[] = tokenizer(x);
            // Add language-specific tokens, unless they already exist
            // after English tokenizer
            tokens.push(...langTokens.filter(t =>
              !baseLunrTokens.find(bt => bt.toString() === t.toString())
            ));
          } else {
            //console.warn(`Language ${lang} does not ship a tokenizer?`);
          }
        }
        return tokens;
      };

      const lunrStopWordFilter = (lunr as any).stopWordFilter;

      (this as any).stopWordFilter = function anaferoStopWordFilter(token: any) {
        return (
          lunrStopWordFilter(token)
          // If a token is a stop word in ANY of supported languages,
          // then it is considered a stop word. This means the more languages
          // we support, the less precise search would be, for now.
          && !nonDefaultLanguages.map(lang =>
            !!(this as any)[lang].stopWordFilter(token)
          ).includes(false)
        ) ? token : undefined;
      };
    }

    // This can be done if needed…
    //this.pipeline.remove(lunr.stemmer);
    //this.searchPipeline.remove(lunr.stemmer);

    // Reduce the effect of document length on term importance.
    // this.b(0.3);
    // Do something about frequent words that are not in stop word filter.
    // this.k1(1.4);

    this.ref('name');
    this.field('title', { boost: 2 });
    this.field('body');
    this.field('lang');

    let done = 0;
    const total =
      Object.keys(searchableResources.pages).length
      +
      Object.keys(searchableResources.resources).length;


    for (const entry of Object.values(searchableResources.pages)) {
      done += 1;
      indexProgress({ state: 'adding entries for pages', total, done });
      this.add(entry, { boost: 2 });
    }
    for (const entry of Object.values(searchableResources.resources)) {
      done += 1;
      indexProgress({ state: 'adding entries for subresources', total, done });
      this.add(entry);
    }
  });

  indexProgress(null);

  yield {
    '/search-index.json': encoder.encode(JSON.stringify(lunrIndex, null, 4)),
  };
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
  let currentConfig: BuildConfig =
    configOverride ?? await readConfig(currentVersionID);

  configProgress(null);

  const baseVersioning = {
    versions,
    currentVersionID,
  } as const;

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
  // TODO: This could be normalized
  // (e.g., attributes could be in the form of attr. name / value pairs,
  // scripts could be just source URLs, links could be rel / href pairs.

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

//function relativeGraph(
//  relations: RelationGraphAsList | Readonly<RelationGraphAsList>,
//  subj: string,
//): Readonly<RelationGraphAsList> {
//  return relations.
//    filter(([s, ]) => s !== ROOT_SUBJECT).
//    map(([s, p, o]) => [s === subj ? ROOT_SUBJECT : s, p, o]);
//}
