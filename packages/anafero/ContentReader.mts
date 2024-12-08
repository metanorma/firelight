import {
  type RelationGraphAsList,
  type RelationTriple,
} from './relations.mjs';
import {
  type ResourceReader,
  type ResourceRelation,
  type StoreAdapterModule,
} from './ResourceReader.mjs';
import {
  type ContentAdapterModule,
} from './ContentGenerator.mjs';

import { isURIString } from './URI.mjs';

import { type TaskProgressCallback } from './progress.mjs';



export interface ContentReader {
  resolve: (resourceURI: string) => Promise<RelationGraphAsList>;
  generatePaths: (fromSubpath?: string) => Generator<{
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


type ContentReaderFactory = (
  entryPointURI: string,
  storeAdapters: StoreAdapterModule[],
  contentAdapter: ContentAdapterModule,
  // /** Whether content adapter thinks this should contribute to content. */
  //relationContributesToContent: (relation: ResourceRelation) => boolean,
  opts: {

    fetchBlob: (path: string, opts?: { atVersion?: string }) => Promise<Uint8Array>;

    reportProgress: TaskProgressCallback;

    /**
     * Allows to offload data from memory if source is large.
     *
     * This is geared towards relations, so each key stores an array
     * (of say edges/relation triples or resource URIs).
     *
     * Browser wrapper can supply something using IndexedDB or OPFS,
     * Node can supply something based on DuckDB.
     * DuckDB-WASM could cover both, but currently can’t persist in browser.
     */
    cache: {
      //set: (keyValueMap: Record<string, unknown>) => void;

      /** Append given values to key, preserving order. */
      add: <T>(key: string, values: readonly T[]) => void;

      /** Return all values at given key in order of addition. */
      get: <T>(key: string, page?: { start: number, size: number }) => readonly T[];

      /** Emit values at given key in order of addition. */
      iterate: <T>(key: string) => Generator<T>;

      /** Returns true if given key exists. */
      has: (key: string) => boolean;
    };

  },
) => Promise<ContentReader>;


/**
 * Using given entry point & configured store & content adapters,
 * orchestrates them (converts entry point to resources, resolving
 * links to other entry points if any are supported;
 * determines page hierarchy).
 *
 * Returns a content reader that can list all paths or resolve a resource.
 */
export const makeContentReader: ContentReaderFactory = async function (
  entryPointURI,
  storeAdapters,
  contentAdapter,
  { fetchBlob, reportProgress, cache },
): Promise<ContentReader> {

  await processRelations(entryPointURI);

  ///**
  // * Captures which entry point resides under which
  // * (not always directly corresponds to URI).
  // */
  //type EntryPointHierarchy = Record<string, EntryPointHierarchy>;
  //const entryPoints: EntryPointHierarchy = {};

  //const entryPointPrefixes: Record<string, string> = {};

  async function processRelations(entryPointURI: string) {
    function handleRelations(triples: readonly RelationTriple<any, any>[]) {
      //cache.add(`${entryPointURI}/edges`, triples);
      const subjectRelations: Record<string, ResourceRelation[]> = {};
      for (const [s, predicate, target] of triples) {

        // Resource reader would indicate topmost relations
        // as being from the _:root blank node.
        const subject = s === '_:root' ? entryPointURI : s;

        subjectRelations[subject] ??= [];
        subjectRelations[subject].push({ predicate, target });

        cache.add(`edges-from/${subject}/${predicate}`, [target]);
      }
      for (const [subject, relations] of Object.entries(subjectRelations)) {
        cache.add(`edges-from/${subject}`, relations);
        cache.add(`${entryPointURI}/subjects`, [subject]);
      }
    }

    const reader = await startReader(entryPointURI);
    reader.discoverAllResources(handleRelations);

    // Init storage adapters for any newly related targets and read them
    // recursively
    for (const subject of cache.iterate<string>(`${entryPointURI}/subjects`)) {
      // Bad time complexity…
      for (const relation of cache.iterate<ResourceRelation>(`edges-from/${subject}`)) {
        if (isURIString(relation.target)) {
          if (!cache.has(`edges-from/${relation.target}`)) {
            if (relation.target.startsWith('file:')) {
              // Since file URIs can be relative to each other,
              // try joining target with current entry point
              // (unless target starts with a slash).
              const fullFileURI = joinFileURI(entryPointURI, relation.target);

              // Process this resource as new entry point.
              //
              // NOTE: Allow recursion here for now,
              // but re-assess if related resource stack gets too deep
              // (unlikely for our needs).
              processRelations(fullFileURI);
            } else {
              // TODO: Implement storage adapter for for non-file: URIs
              console.debug("Not following relation target (unsupported)", relation.target);
            }
          }
        }
      }
    }
  }

  function maybeGetPathComponent(relation: ResourceRelation) {
    if (isURIString(relation.target)) {
      // If this is not a relation to another resource but a primitive value,
      // it cannot generate hierarchy.
      return null;
    }

    if (!contentAdapter.contributingToHierarchy) {
      throw new Error("Content adapter doesn’t specify hierarchy-contributing relations");
    }

    // Among contributing chains, find any starting with current predicate
    // and cut the current predicate off the start of each.
    const maybeContributingRelations = contentAdapter.contributingToHierarchy.
      filter(r => r[0] === relation.predicate).
      map(r => r.slice(1));

    if (maybeContributingRelations.length > 0) {
      // Resolve chains that start with this relation’s predicate 
      // relative to resource being considered
      return resolvePredicateChainsToFirstValue(
        relation.target,
        maybeContributingRelations,
      );
    }

    return null;
  }

  /**
   * Chains of predicates.
   * Follows each chain and returns the first resolved value, if any.
   */
  function resolvePredicateChainsToFirstValue(
    resourceURI: string,
    chains: string[][],
  ): string | null {
    for (const chain of chains) {
      const maybeResult = resolvePredicateChainRecursively(resourceURI, chain)[0];
      if (maybeResult) {
        return maybeResult;
      }
    }
    return null;
  }

  function resolvePredicateChainRecursively(
    resourceURI: string,
    /**
     * E.g., ['hasPart', 'hasClauseIdentifier'] means
     * “chech if resource specifies hasPart, and if it points to a resource
     * then return that resource’s hasClauseIdentifier value”.
     */
    chain: string[],
  ): readonly string[] {
    if (chain.length < 1) {
      return [];
    }
    const nextPredicate = chain[0];
    const nextValues = cache.get<string>(`edges-from/${resourceURI}/${nextPredicate}`);
    if (chain.length === 1) {
      // We’ve reached end of the chain, and these are the values.
      return nextValues;
    } else {
      // Run this for each of the values that are URIs (point to other resources)
      // and combine results into a single flat list.
      // Cut away the first predicate in the chain, since we’ve processed it
      // and are moving on to the subsequent one.
      return nextValues.
      filter(isURIString).
      flatMap(val => resolvePredicateChainRecursively(val, chain.slice(1)));
    }
  }

  function * generateRelations(resourceURI: string) {
    const chunkSize = 1000;
    let finished = false;
    let cursor = 0;
    while (!finished) {
      const relations = cache.get<ResourceRelation>(
        `edges-from/${resourceURI}`,
        { start: cursor, size: chunkSize },
      );
      if (relations.length > 0) {
        yield * relations;
      } else {
        finished = true;
      }
    }
  }

  function * generatePaths(
    resourceURI: string,

    /** Empty string for root. */
    pathPrefix: string,
  ): Generator<[string, string]> {
    yield [pathPrefix, resourceURI];
    for (const rel of generateRelations(resourceURI)) {
      const maybePathComponent = maybeGetPathComponent(rel);
      if (maybePathComponent) {
        if (!isValidPathComponent(maybePathComponent)) {
          throw new Error("Generated path component is not valid");
        }
        yield * generatePaths(resourceURI, maybePathComponent);
      }
    }
  }

  /** Generates pages, starting from topmost entryPointURI. */
  function * generatePages() {
    for (const [path, resourceURI] of generatePaths(entryPointURI, '')) {
      const relations = cache.get(`edges-from/${resourceURI}`);
      const content = contentAdapter.generateContent(relations);
      // yield page
    }
  }

  async function startReader(
    resourceURI: string,
  ): Promise<ResourceReader> {
    if (!resourceURI.startsWith('file:')) {
      throw new Error("Cannot start reader for resource: only file: URIs are supported");
    }
    const filePath = resourceURI.split('file:')[1]!;
    const blob = await fetchBlob(filePath);
    const validAdapters = storeAdapters.filter(mod =>
      mod.canResolve(resourceURI) && mod.readerFromBlob !== undefined);
    for (const mod of validAdapters) {
      try {
        return (await mod.readerFromBlob!(blob))[1];
      } catch (e) {
        console.warn("Failed to create resource reader for URI", mod.name, resourceURI, baseURI);
      }
    }
    throw new Error("Failed to initialize resource reader");
  }
}


function isValidPathComponent(val: string): boolean {
  return val.indexOf('/') < 0;
}


/**
 * Given two `file:` URIs, makes a new one where
 * they are joined, unless the second one starts with slash in which
 * case it’s returned as is.
 *
 * This is for the purposes of following references in the source.
 * E.g., file:/doc/foo.xml may contain a ref to file:bar/baz.xml,
 * in which case “bar” will be assume to be under “doc”.
 *
 * Guarantees to return a `file:` URI or throw.
 */
function joinFileURI(baseFileURI: string, fileURI: string): string {
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
