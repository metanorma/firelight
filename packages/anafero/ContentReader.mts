import {
  ROOT_SUBJECT,
  type RelationGraphAsList,
  type RelationTriple,
} from './relations.mjs';

import {
  type ResourceReader,
  type ResourceRelation,
  type StoreAdapterModule,
} from './StoreAdapter.mjs';

import {
  type ContentAdapterModule,
} from './ContentAdapter.mjs';

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
    /**
     * URI identifying a resource, obtained from store adapter.
     */
    resourceURI: string;
    /**
     * Path to webpage for this resource,
     * with leading but no trailing slash. Empty string for root.
     */
    path: string;
    parentChain: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
    directDescendants: [path: string, uri: string, graph: Readonly<RelationGraphAsList>][];
  }>;
  getUnresolvedRelations: () => Readonly<RelationGraphAsList>;
  findContainingPageResourceURI: (resourceURI: string) => string | undefined;
  findURL: (resourceURI: string) => string;
  countPaths: () => number;
  exists: (uri: string) => boolean;
  //traverseHierarchy: (subpath?: string) => AsyncGenerator<ResourceWithRelations>,
}


type ContentReaderFactory = (
  entryPointURI: string,
  storeAdapters: StoreAdapterModule[],
  findContentAdapter: (resourceURI: string) => ContentAdapterModule,
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
  findContentAdapter,
  { fetchBlob, reportProgress, decodeXML, cache },
): Promise<ContentReader> {

  /**
   * Maps entry point URI which was given by the author
   * to canonical URI obtained from the reader.
   *
   * If reader did not return a canonical URI,
   * the entry point URI is considered such.
   */
  const canonicalURIs: Record<string, string> = {};

  /** The reverse of ``canonicalURIs``. */
  const originalURIs: Record<string, string> = {};

  /** Maps each resource URI to respective content adapter. */
  const contentAdapters: Record<string, ContentAdapterModule> = {};

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
    function expandRelationTarget(relationTarget: string): string {
      const isFileURI = relationTarget.startsWith('file:');
      return isFileURI
          // Since file URIs can be relative to each other,
          // try joining target with current entry point
          // (unless target starts with a slash).
        ? joinFileURI(entryPointURI, relationTarget)
        : relationTarget;
    }
    function handleRelations(triples: readonly RelationTriple<any, any>[]) {
      //cache.add(`${entryPointURI}/edges`, triples);
      const subjectRelations: Record<string, ResourceRelation[]> = {};
      for (const [s, predicate, t] of triples) {
        // Resource reader would indicate topmost relations
        // as being from the _:root blank node.
        const subject = s === ROOT_SUBJECT ? entryPointURI : s;

        const target = expandRelationTarget(t);

        console.debug("    Got relation", { s, subject, predicate, t, target });

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

    console.debug("=== Got entry point ===", entryPointURI);

    const reader = await startReader(entryPointURI);
    totalRelationCount += reader.estimateRelationCount();

    const canonicalRootResourceURI =
      reader.getCanonicalRootURI?.() ?? entryPointURI;

    canonicalURIs[entryPointURI] = canonicalRootResourceURI;
    originalURIs[canonicalRootResourceURI] = entryPointURI;

    onProgress({ total: totalRelationCount });
    reader.discoverAllResources(handleRelations, {
      onProgress: function (msg) {
        onProgress({
          state: `${decodeURIComponent(canonicalRootResourceURI)}->…->${msg}`,
        });
      },
    });

    // Init storage adapters for any newly related targets and read them
    // recursively
    for (const subject of cache.iterate<string>(`${entryPointURI}/subjects`)) {
      // Bad time complexity…
      for (const relation of cache.iterate<ResourceRelation>(`edges-from/${subject}`)) {
        if (isURIString(relation.target)) {
          if (!cache.has(`edges-from/${relation.target}`)) {
            const isFileURI = relation.target.startsWith('file:');
            if (isFileURI) {
              // Process this resource as new entry point.
              //
              // NOTE: Allow recursion here for now,
              // but re-assess if we have very deep reader chains.
              processRelations(relation.target, onProgress);
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

  /**
   * Returns a path component based on `relation` of `resourceURI`,
   * if that relation should create hierarchy.
   */
  function maybeGetPathComponent(contentAdapter: ContentAdapterModule, relation: ResourceRelation) {
    if (!isURIString(relation.target) || contentAdapter.crossReferences?.(relation)) {
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
      const result = resolvePredicateChainsToFirstValue(
        relation.target,
        maybeContributingRelations,
      );
      return result
        ? result.replaceAll(':', '_').replaceAll('/', '_')
        : result;
    }

    return null;
  }

  /**
   * Chains of predicates from given resource.
   * Follows each chain recursively
   * and returns the first resolved value, if any.
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
    if (cache.has(`edges-from/${resourceURI}`)) {
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
  }

  function isInPageHierarchy(resourceURI: string) {
    if (cache.has(`path-for/${resourceURI}`)) {
      try {
        const path = cache.get<string>(`path-for/${resourceURI}`);
        return path && path.indexOf('#') < 0;
      } catch (e) {
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Gets resource graph, following relations
   * unless related resource is in hierarchy.
   *
   * Prefers cached graph, if already requested before.
   *
   * Relies on result of processHierarchy().
   */
  function getResourceGraph(
    _resourceURI: string,
  ): Readonly<RelationGraphAsList> {
    // Un-canonicalize entry point URI, if needed
    const resourceURI = originalURIs[_resourceURI] ?? _resourceURI;
    if (!cache.has(`graphs/${resourceURI}`)) {

      // Ensure there is an empty graph
      cache.add(`graphs/${resourceURI}`, []);

      const contentAdapter = contentAdapters[resourceURI];
      if (!contentAdapter) {
        throw new Error("Resource does not have associated content adapter on record");
      }

      //const resourcePath = cache.get<string>(`path-for/${resourceURI}`);
      const queue: string[] = [resourceURI];
      while (queue.length > 0) {
        const currentResource = queue.pop()!;
        if (!cache.has(`edges-from/${currentResource}`)) {
          //console.warn("No graph for", currentResource);
          if (entryPointURI === currentResource) {
            // Throw error if we are *supposed* to have some graph
            // because it’s an entry point resource
            throw new Error(`No resource graph found for ${currentResource}`);
          }
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

          //if (currentResource !== resourceURI) {
          //  cache.set({
          //    [`path-for/${currentResource}`]: `${resourcePath}#${currentResource}`,
          //  });
          //}

          // Add valid new targets to the queue
          // to be processed as part of this resource graph:

          const newTargets = relations.
          // Do not queue target if related resource is not a URI
          filter(({ target }) => isURIString(target)).
          // Do not queue target if related resource is already in path hierarchy
          // (either as itself or as part of another resource).
          // It should not be part of this graph in that case.
          filter(rel =>
            !isInPageHierarchy(rel.target)
            && !contentAdapter.crossReferences?.(rel)
          ).
          // Do not queue target if it was already queued
          filter(rel => !queue.includes(rel.target)).
          map(({ target }) => target);

          queue.push(...newTargets);
        }
      }
    }
    return cache.list<RelationTriple<any, any>>(`graphs/${resourceURI}`);
  }

  /**
   * Adds to cache all related resources as paths with URL fragments
   * under containing resource path.
   */
  function processResourceContents(
    contentAdapter: ContentAdapterModule,
    resourceURI: string,
    containingResourcePath: string,

    /** Used for recursion, callers must not specify. */
    _seen?: Set<string>,
  ) {
    contentAdapters[resourceURI] = contentAdapter;

    const seen = _seen ?? new Set<string>();
    cache.set({
      [`path-for/${resourceURI}`]: `${containingResourcePath}#${resourceURI}`,
    });
    for (const rel of generateRelations(resourceURI)) {
      if (isURIString(rel.target) && !contentAdapter.crossReferences?.(rel)) {
        // TODO: Recursion is not good here since it can be deep
        //console.debug("processResourceContents", containingResourcePath, resourceURI, rel);
        const key = JSON.stringify({ rel, resourceURI, containingResourcePath });
        if (seen.has(key)) {
          console.warn(`Ignoring duplicate relation ${rel.predicate} to ${rel.target} from ${resourceURI} at ${containingResourcePath}`);
          continue;
          //throw new Error(`Duplicate ${rel.predicate} to ${rel.target} from ${resourceURI} at ${containingResourcePath}`);
        } else {
          seen.add(key);
          processResourceContents(contentAdapter, rel.target, containingResourcePath, seen);
        }
      }
    }
  }

  /**
   * Given resource URI and path prefix,
   * will populate its path (also parents & parents’ descendants) in cache,
   * resolve relations and recurse for related resources
   * that generated subpaths.
   *
   * For related resources that did not generate subpaths,
   * their paths (with URI fragment) will be added to cache.
   */
  function processHierarchy(
    resourceURI: string,

    /** Empty string for root. */
    pathPrefix: string,

    onProgress: (msg: string) => void,
  ) {
    const contentAdapter = findContentAdapter(canonicalURIs[resourceURI] ?? resourceURI);
    contentAdapters[resourceURI] = contentAdapter;

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
      const maybePathComponent = maybeGetPathComponent(contentAdapter, rel);
      if (maybePathComponent) {
        if (!isValidPathComponent(maybePathComponent)) {
          console.error("Generated path component is not valid", maybePathComponent, rel);
          throw new Error("Generated path component is not valid");
        }
        const newPath = pathPrefix
          ? `${pathPrefix}/${maybePathComponent}`
          : maybePathComponent;
        // NOTE: Allow recursion, since no sane hierarchy
        // is expected to be too large for that to become an issue.
        processHierarchy(rel.target, newPath, onProgress);
      } else if (isURIString(rel.target)) {
        processResourceContents(contentAdapter, rel.target, pathPrefix);
      }
    }
  }

  function getCachedResourceURIForPath(path: string) {
    const resourceURI = cache.get<string>(path);
    if (!resourceURI) {
      throw new Error("Unable to obtain resource URI for path");
    }
    const canonicalURI = canonicalURIs[resourceURI] ?? resourceURI;
    //if (canonicalURI !== resourceURI) {
    //  console.info("Got canonical URI", canonicalURI, 'for', resourceURI);
    //}
    return canonicalURI;
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
      const resourceURI = getCachedResourceURIForPath(path);
      yield {
        path,
        resourceURI,
        directDescendants: cache.has(`${path}/direct-descendants`)
          ? cache.list<string>(`${path}/direct-descendants`).map(path => {
              const res = getCachedResourceURIForPath(path);
              return [`/${path}`, res, getResourceGraph(res)];
            })
          : [],
        parentChain: path !== ''
          ? cache.list<string>(`${path}/parents`).map(path => {
              const res = getCachedResourceURIForPath(path);
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
    exists: function exists (resourceURI) {
      return cache.has(`path-for/${resourceURI}`);
    },
    findContainingPageResourceURI: function findPageURI (resourceURI) {
      const path = cache.get<string>(`path-for/${resourceURI}`);
      if (path.indexOf('#')) {
        return cache.get<string>(path.split('#')[0]!);
      } else {
        return resourceURI;
      }
    },
    findURL: function findURL (resourceURI) {
      const maybePath = cache.get<string>(`path-for/${resourceURI}`);
      if (maybePath) {
        return maybePath.startsWith('/') ? maybePath : `/${maybePath}`;
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
    //console.debug("starting reader for", resourceURI);
    const filePath = resourceURI.split('file:')[1]!;
    const blob = await fetchBlob(filePath);
    const validAdapters = storeAdapters.filter(mod =>
      mod.canResolve(resourceURI) && mod.readerFromBlob !== undefined);
    for (const mod of validAdapters) {
      try {
        //console.debug("trying", mod.name, resourceURI);
        const reader = (await mod.readerFromBlob!(blob, { decodeXML }))[1];
        //console.debug("using", mod.name);
        return reader;
      } catch (e) {
        //console.warn("Failed to create resource reader for URI", mod.name, resourceURI);
      }
    }
    throw new Error(`Failed to initialize resource reader for ${resourceURI}`);
  }
}


// Utils


function isValidPathComponent(val: string): boolean {
  return val.indexOf('/') < 0 && val.indexOf(':') < 0 && val.indexOf('#') < 0;
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
  //console.debug("joinFileURI", baseFileURI, filePath, fileURI, `file:${dirname}${dirname ? '/' : ''}${filePath}`);
  return filePath.startsWith('/')
    ? fileURI
    // ^ Treat given fileURI as root-relative
    : `file:${dirname}${dirname ? '/' : ''}${filePath}`
    // ^ Join dirname of base path with apparently relative file path
}
