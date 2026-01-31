import type { RelationGraphAsList } from '../relations.mjs';
import { isURIString } from '../URI.mjs';

/**
 * Returns the target of first found relation
 * of given subject via given predicate.
 */
export function findValue(
  relations: Readonly<RelationGraphAsList>,
  subj: string,
  pred: string,
): string | null {
  return relations.find(([s, p, ]) => s === subj && p === pred)?.[2] ?? null;
}


/**
 * Given a chain of predicates like `[hasLanguage, hasText]`,
 * returns a list of subjects that have that predicate and its value
 * (like `[[someLanguageID, ja], [anotherLanguageID, en]]`).
 */
export function resolveChain(
  /** Graph to resolve the chain in. */
  relations: Readonly<RelationGraphAsList>,
  /** Chain of predicates. */
  chain: string[],
  /** Starting subject. */
  subj_?: string,
): [subj: string, value: string][] {
  if (chain.length === 1) {
    // Reached the end of the chain, return matching predicates
    // for current subject
    return relations.
      filter(rel => rel[1] === chain[0] && (!subj_ || rel[0] === subj_)).
      map(rel => [rel[0], rel[2]]);
  } else {
    return relations.
      // Take relations that match the next predicate
      filter(rel => rel[1] === chain[0] && (!subj_ || rel[0] === subj_)).
      // For each relation, resolve remaining chain against any relations
      // that have its target as subject
      map(rel =>
        resolveChain(
          relations,
          chain.slice(1),
          rel[2])).
      flat();
  }
}


/**
 * Recursively extracts text content
 * of given subject in given graph.
 *
 * The result is returned as an array of strings
 * that can be concatenated directly (without any spacing).
 */
export function getTextContent(
  graph: Readonly<RelationGraphAsList>,
  subject: string,
  /**
   * If provided, only include parts for which this returns true.
   * Recursively passed down.
   */
  partPredicate?: (partValue: string, partType?: string) => boolean,
): string[] {
  const allSubparts: string[] =
  // TODO: subject is really only used to resolve relations,
  // maybe this can be refactored out of this function.
  resolveChain(graph, ['hasPart'], subject).
  flatMap(([partID, partValue]) => {
    // TODO: Don’t rely on urn: prefix when determining subjectness
    if (!isURIString(partValue)) {
      // Part itself is not a subject, so treat as text.

      if (partValue.startsWith('data:')) {
        return [''];
      } else if (partPredicate && !partPredicate(partValue)) {
        return [''];
      } else if (partValue.trim() === '') {
        return [''];
      } else {
        return [partValue];
      }
    } else {
      return getTextContent(graph, partValue, partPredicate);
    }
  });
  return allSubparts;
}
