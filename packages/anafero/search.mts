import { ROOT_SUBJECT, type RelationGraphAsList } from './relations.mjs';
import { isURIString } from './URI.mjs';


/**
 * Normalizes a string for indexing.
 * Should (actually, must) be applied to search queries as well.
 */
export function preprocessStringForIndexing(text: string): string {
  return text.
    normalize('NFKD').
    replace(/\p{Diacritic}/gu, '').
    trim();
}


/**
 * Filters relations that are considered to be part of given (sub)resource
 * for indexing purposes. This should exclude nested subresources,
 * which would be indexed separately.
 */
export function extractRelationsForIndexing(
  uri: string,

  /** The graph only for given subresource. */
  graph: Readonly<RelationGraphAsList>,

  /** Returns true if subject is defined elsewhere (in a wider graph). */
  isDefinedSubject: (uri: string) => boolean,
): Readonly<RelationGraphAsList> {
  return graph.filter(([s, p, o]) =>
    p === 'hasPart'
    &&
    (s === uri || s === ROOT_SUBJECT)
    &&
    !o.startsWith('data:')
    &&
    (!isURIString(o) || !isDefinedSubject(o))
  );
}
