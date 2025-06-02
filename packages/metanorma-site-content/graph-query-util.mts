import {
  type RelationGraphAsList,
  ROOT_SUBJECT,
  isURIString,
} from 'anafero/index.mjs';


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

//function findAtRoot(relations: Readonly<RelationGraphAsList>, predicate: string): string | null {
//  return findValue(relations, '_:root', predicate);
//}


// TODO: Some of these may be moved into the core and provided as helpers

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
 * Returns all targets of any relations found
 * from given subject via given predicate (or any of them, if is a list).
 */
export function findAll(
  graph: Readonly<RelationGraphAsList>,
  subj: string,
  pred: string | string[],
): string[] {
  return graph.
    filter(([s, p, ]) =>
      s === subj && (
        (typeof pred === 'string' && p === pred) || pred.includes(p)
      )
    ).
    map(([, , o]) => o);
}

/**
 * Returns all targets (objects) of `hasPart` relations
 * found from given subject in the graph, where related object
 * has `type` relation with specified value.
 */
export function findPartsOfType(
  graph: Readonly<RelationGraphAsList>,
  subj: string,
  type: string,
): string[] {
  return findAll(graph, subj, 'hasPart').
    filter(part => findValue(graph, part, 'type') === type);
}

export function relativeGraph(relations: Readonly<RelationGraphAsList>, subj: string): Readonly<RelationGraphAsList> {
  return relations.
    filter(([s, ]) => s !== ROOT_SUBJECT).
    map(([s, p, o]) => [s === subj ? ROOT_SUBJECT : s, p, o]);
}

/** Returns true if subject is present in the graph. */
export function hasSubject(relations: Readonly<RelationGraphAsList>, subj: string) {
  return relations.find(([s, ]) => s === subj) !== undefined;
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

      if (partPredicate && !partPredicate(partValue)) {
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

// /**
//  * Returns all relations from given subject,
//  * recursively resolving any targets that also serve as subjects.
//  */
// function getAllRelations(
//   relations: Readonly<RelationGraphAsList>,
//   subj: string,
//   depth: number | undefined = undefined,
//   _seen?: Set<string>,
// ): Readonly<RelationGraphAsList> {
//   const seen = _seen ?? new Set();
//   return relations.map(([s, p, o]): Readonly<RelationGraphAsList> => {
//     if (s === subj) {
//       console.debug("Got relation", p, o)
//       const subjectGraph = [
//         [s, p, o] as RelationTriple<string, string>,
//       ];
//       if (depth === undefined || depth > 0) {
//         seen.add(o);
//         subjectGraph.push(...getAllRelations(relations, o, depth ? depth - 1 : depth, seen));
//       }
//       return subjectGraph;
//     } else {
//       return [];
//     }
//   }).flat();
// }

///**
// * Runs valueChecker for every value of matching chain,
// * and returns matching relations. */
//function match(
//  relations: Readonly<RelationGraphAsList>,
//  chain: string[],
//  valueChecker: (val: string) => boolean,
//): RelationTriple<string, string>[] {
//}
