import {
  ROOT_SUBJECT,
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

import {
  type Cache,
} from './cache.mjs';

import {
  type TaskProgressCallback,
  type Progress,
} from './progress.mjs';

import { isURIString } from './URI.mjs';


export interface ContentReader {
  resolve: (resourceURI: string) => Readonly<RelationGraphAsList>;
  generatePaths: (fromSubpath?: string) => Generator<{
    /** Path with leading but no trailing slash. Empty string for root. */
    path: string;
    /**
     * URI identifying a resource.
     * A file: URI means there was no reader that could resolve it,
     * and it is expected to be emitted under that path
     */
    resourceURI: string;
    parentChain: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
    directDescendants: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
  }>;
  getUnresolvedRelations: () => Readonly<RelationGraphAsList>;
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

    decodeXML: (data: Uint8Array) => Document;

    reportProgress: TaskProgressCallback;

    /**
     * Allows to offload data from memory if source is large.
     */
    cache: Cache;

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
  { fetchBlob, reportProgress, decodeXML, cache },
): Promise<ContentReader> {

  let totalPathCount = 0;

  let totalRelationCount = 0;
  let doneRelationCount = 0;

  async function process() {
    const [relationsProgress] = reportProgress('read resources');
    await processRelations(entryPointURI, relationsProgress);
    relationsProgress(null);

    const [hierarchyProgress] = reportProgress('prepare site structure');
    processHierarchy(entryPointURI, '', function reportHierarchyProgress(state) {
      hierarchyProgress({ state });
    });
    hierarchyProgress(null);
  }

  await process();

  ///**
  // * Captures which entry point resides under which
  // * (not always directly corresponds to URI).
  // */
  //type EntryPointHierarchy = Record<string, EntryPointHierarchy>;
  //const entryPoints: EntryPointHierarchy = {};

  //const entryPointPrefixes: Record<string, string> = {};

  async function processRelations(
    entryPointURI: string,
    onProgress: (prog: Progress) => void,
  ) {
    function handleRelations(triples: readonly RelationTriple<any, any>[]) {
      //cache.add(`${entryPointURI}/edges`, triples);
      const subjectRelations: Record<string, ResourceRelation[]> = {};
      for (const [s, predicate, target] of triples) {

        // Resource reader would indicate topmost relations
        // as being from the _:root blank node.
        const subject = s === ROOT_SUBJECT ? entryPointURI : s;

        subjectRelations[subject] ??= [];
        subjectRelations[subject].push({ predicate, target });

        cache.add(`edges-from/${subject}/${predicate}`, [target]);
      }
      for (const [subject, relations] of Object.entries(subjectRelations)) {
        cache.add(`edges-from/${subject}`, relations);
        cache.add(`${entryPointURI}/subjects`, [subject]);
      }
      doneRelationCount += triples.length;
      onProgress({ done: doneRelationCount, total: totalRelationCount });
    }

    const reader = await startReader(entryPointURI);
    totalRelationCount += reader.estimateRelationCount();

    onProgress({ total: totalRelationCount });
    reader.discoverAllResources(handleRelations, {
      onProgress: function (msg) {
        onProgress({
          state: `${entryPointURI}->…->${msg}`,
        });
      }
    });

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
              // but re-assess if we have very deep reader chains.
              processRelations(fullFileURI, onProgress);
            } else {
              // TODO: Implement storage adapter for for non-file: URIs
              //console.warn("Unable to follow relation", relation.target);
              cache.add('unresolved-relations', [[subject, relation.predicate, relation.target]]);
              //cache.add(`unresolved-relations-from/${subject}`, [relation]);
            }
          }
        }
      }
    }
  }

  function maybeGetPathComponent(relation: ResourceRelation) {
    if (!isURIString(relation.target)) {
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
    const key = `edges-from/${resourceURI}/${nextPredicate}`;
    if (!cache.has(key)) {
      return [];
    }
    const nextValues = cache.list<string>(key);
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
      const relations = cache.list<ResourceRelation>(
        `edges-from/${resourceURI}`,
        { start: cursor, size: chunkSize },
      );
      if (relations.length > 0) {
        yield * relations;
        cursor += chunkSize;
      } else {
        finished = true;
      }
    }
  }

  /**
   * Gets resource graph, following relations
   * unless related resource is in hierarchy.
   *
   * Prefers cached graph, if already requested before.
   */
  function getResourceGraph(
    resourceURI: string,
  ): Readonly<RelationGraphAsList> {
    if (!cache.has(`graphs/${resourceURI}`)) {
      const resourcePath = cache.get<string>(`path-for/${resourceURI}`);
      const queue: string[] = [resourceURI];
      while (queue.length > 0) {
        const currentResource = queue.pop()!;
        if (!cache.has(`edges-from/${currentResource}`)) {
          //console.warn("No graph for", currentResource);
        } else {
          const relations = cache.list<ResourceRelation>(`edges-from/${currentResource}`);
          cache.add(
            `graphs/${resourceURI}`,
            relations.map(({ predicate, target }) => [
              currentResource === resourceURI
                ? ROOT_SUBJECT
                : currentResource,
              predicate,
              target,
            ]),
          );

          if (currentResource !== resourceURI) {
            cache.set({
              [`path-for/${currentResource}`]: `${resourcePath}#${currentResource}`,
            });
          }

          const newTargets = relations.
          map(({ target }) => target).
          // Do not queue target if related resource is not a URI
          filter(isURIString).
          // Do not queue target if related resource is already in path hierarchy
          // (it should not be part of this graph, then)
          filter(target =>
            !cache.has(`path-for/${target}`)
          ).
          // Do not queue target if it was already queued
          filter(target => !queue.includes(target));

          queue.push(...newTargets);
        }
      }
    }
    return cache.list<RelationTriple<any, any>>(`graphs/${resourceURI}`);
  }

  function processHierarchy(
    resourceURI: string,

    /** Empty string for root. */
    pathPrefix: string,

    onProgress: (msg: string) => void,
  ) {

    cache.add('all-paths', [pathPrefix]);
    cache.set({ [pathPrefix]: resourceURI });
    cache.set({ [`path-for/${resourceURI}`]: pathPrefix });

    onProgress(`${pathPrefix ?? '/'}: ${resourceURI}`);

    totalPathCount += 1;

    const parentPath = pathPrefix !== ''
      ? pathPrefix.includes('/')
        ? pathPrefix.slice(0, pathPrefix.lastIndexOf('/'))
        : ''
      : null;

    if (parentPath !== null) {
      cache.add(`${parentPath}/direct-descendants`, [pathPrefix]);
      const parentPathParts = parentPath.split('/');
      const parentPaths = parentPathParts.map((_, idx) =>
        `${parentPathParts.slice(0, idx + 1).join('/')}`
      );
      parentPaths.reverse();
      // This is awkward, but the above logic means the root entry
      // may be missing from parents for nested paths.
      if (!parentPaths.includes('')) {
        parentPaths.push('');
      }
      cache.set({
        [`${pathPrefix}/parents`]: parentPaths,
      });
    }

    for (const rel of generateRelations(resourceURI)) {
      const maybePathComponent = maybeGetPathComponent(rel);
      if (maybePathComponent) {
        if (!isValidPathComponent(maybePathComponent)) {
          throw new Error("Generated path component is not valid");
        }
        const encodedComponent = maybePathComponent.replace(':', '_');
        const newPath = pathPrefix
          ? `${pathPrefix}/${encodedComponent}`
          : encodedComponent;
        // NOTE: Allow recursion, since no sane hierarchy
        // is expected to be too large for that to become an issue.
        processHierarchy(rel.target, newPath, onProgress);
      }
    }
  }

  function * generateAllPaths(): Generator<{
    /** Path with leading but no trailing slash. Empty string for root. */
    path: string;
    /**
     * URI identifying a resource.
     * A file: URI means there was no reader that could resolve it,
     * and it is expected to be emitted under that path
     */
    resourceURI: string;
    parentChain: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
    directDescendants: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
  }> {
    for (const path of cache.iterate<string>('all-paths')) {
      const resourceURI = cache.get<string>(path);
      if (!resourceURI) {
        throw new Error("Have path, but not its resource URI during processing");
      }
      yield {
        path,
        resourceURI,
        directDescendants: cache.has(`${path}/direct-descendants`)
          ? cache.list<string>(`${path}/direct-descendants`).map(path => {
              const res = cache.get<string>(path);
              return [`/${path}`, res, getResourceGraph(res)];
            })
          : [],
        parentChain: path !== ''
          ? cache.list<string>(`${path}/parents`).map(path => {
              const res = cache.get<string>(path);
              return [`/${path}`, res, getResourceGraph(res)];
            })
          : [],
      }
    }
  }

  return {
    countPaths: () => totalPathCount,
    generatePaths: generateAllPaths,
    getUnresolvedRelations: function getUnresolvedRelations() {
      if (cache.has('unresolved-relations')) {
        return cache.get<RelationGraphAsList>('unresolved-relations');
      } else {
        return [];
      }
    },
    findURL: function findURL (resourceURI) {
      const maybePath = cache.get<string>(`path-for/${resourceURI}`);
      if (maybePath) {
        return maybePath;
      } else {
        throw new Error("Unable to find URL for resource");
      }
    },
    resolve: function resolveGraph (resourceURI) {
      return getResourceGraph(resourceURI);
    },
  };

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
        return (await mod.readerFromBlob!(blob, { decodeXML }))[1];
      } catch (e) {
        console.warn("Failed to create resource reader for URI", mod.name, resourceURI);
      }
    }
    throw new Error("Failed to initialize resource reader");
  }
}


function isValidPathComponent(val: string): boolean {
  return val.indexOf('/') < 0 && val.indexOf('#') < 0;
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