import {
  ROOT_SUBJECT,
  type RelationTriple,
  type RelationGraphAsList,
} from './relations.mjs';
import { isURIString } from './URI.mjs';


/**
 * Normalizes a string for indexing.
 * Should (actually, must) be applied to search queries as well.
 */
export function preprocessStringForIndexing(text: string): string {
  return text.
    normalize('NFKD').
    // Simplifies searching in French etc.
    replace(/\p{Diacritic}/gu, '').
    // Zero-width spaces and stuff
    replace(/[\u200B-\u200D\uFEFF]/g, '').
    trim();
}


/**
 * Filters relations that are considered to be part of given (sub)resource
 * for indexing purposes. Includes nested subresources, unless they are known
 * to be indexed separately.
 *
 * Returns a list of triple objects that are plain values suitable
 * for indexing.
 */
export function extractRelationsForIndexing(
  uri: string,

  /** The graph only for given subresource. */
  graph: Readonly<RelationGraphAsList>,

  /**
   * Returns true if subject is defined on the page
   */
  isIndexable: (rel: RelationTriple<any, any>) => boolean,

  /**
   * Returns true if subject is already “defined” and therefore indexed,
   * and should not be indexed as part of its parent.
   * (See #97.)
   */
  isAlreadyIndexed: (uri: string) => boolean,

  /** Used when recursing. */
  _seen?: Set<string>,

  _log?: true,
): Readonly<string[]> {

  const seen = _seen ?? new Set();
  seen.add(uri);

  const nonData = graph.filter(([, , o]) =>
    !o.startsWith('data:')
  );
  const immediateGraph = nonData.filter(([s, , ]) =>
    (s === uri || s === ROOT_SUBJECT)
  );
  const references = immediateGraph.filter(([, , o]) =>
    isURIString(o)
  );

  const indexable = immediateGraph.filter(([s, p, o]) =>
    !isURIString(o) && isIndexable([s, p, o])
  ).
  map(([, , o]) => o).
  filter(o => o.trim() !== '');

  // Resolve references recursively, stopping at resources
  // that are already indexed

  for (const [, , o] of references) {
    if (_log) {
      console.debug(
        "search: processing triple object",
        { o, isAlreadyIndexed: isAlreadyIndexed(o) },
      );
    }
    if (!isAlreadyIndexed(o) && !seen.has(o)) {
      indexable.push(...extractRelationsForIndexing(
        o,
        graph,
        isIndexable,
        isAlreadyIndexed,
        seen,
        _log,
      ));
    }
  }

  if (_log) {
    console.debug(
      "search: obtained indexable from graph",
      { uri, graph, indexable },
    );
  }

  return indexable;
}
