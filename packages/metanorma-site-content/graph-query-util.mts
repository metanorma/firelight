import {
  type RelationGraphAsList,
  ROOT_SUBJECT,
  resolveChain,
  getTextContent,
} from 'anafero/index.mjs';

export { resolveChain, getTextContent };

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
