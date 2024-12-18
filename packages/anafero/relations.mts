// Anafero operates resource graphs that are expressed, like in RDF, as triples.

import * as S from '@effect/schema/Schema';
import { type ResourceRelation } from './ResourceReader.mjs';


// Reference to root subject of a subgraph.
// In case of the overall site graph that’s the top-level resource.
// In many other cases, however, generating content/describing resource
// does not require knowing its ID when logic operates on subgraphs.
export const ROOT_SUBJECT = '_:root';


export const RelationTripleSchema = S.Tuple(
  // TODO: Named tuple elements with Effect Schema—possible?
  // These annotations do not carry to typing hints.
  S.element(S.String.pipe(S.nonEmptyString())).annotations({
    title: "Object being described (subject of the relation)",
  }),
  S.element(S.String.pipe(S.nonEmptyString())).annotations({
    title: "Predicate of the relation (property name)",
  }),
  S.element(S.String).annotations({
    title: "Object or target of the relation (property value)",
  }),
);

// /** A relation triple where any element can be missing. */
// export const PartialRelationTripleSchema = S.Tuple(
//   // TODO: Named tuple elements with Effect Schema—possible?
//   // These annotations do not carry to typing hints.
//   S.element(S.String.pipe(S.nonEmptyString())).annotations({
//     title: "Subject of the relation",
//   }),
//   S.element(S.String.pipe(S.nonEmptyString())).annotations({
//     title: "Predicate of the relation (a.k.a. property name)",
//   }),
//   S.element(S.String).annotations({
//     title: "Object or target of the relation (a.k.a. property value)",
//   }),
// );

/**
 * A list of resource’s relations.
 *
 * Assumed to be resolved recursively, stopping at resources
 * that contributed to site hierarchy.
 *
 * Should have at least one relation for the subject itself (type).
 * For example, assuming hierarchy has “urn:obj:X” in it somewhere:
 * ```
 * [
 *  [_:root type clause]
 *  [_:root id urn:relaton:sdo:1234-5-6:5:B2.4]
 *  [_:root hasPart someTitle]
 *  [someTitle type title]
 *  [someTitle hasPart "Hello"]
 *  [someTitle hasPart someLink]
 *  [someLink type link]
 *  [someLink seeAlso urn:obj:X]
 *  [someLink hasPart "Link"]
 *  [someTitle hasPart "to World"]
 * ]
 * ```
 */
export const RelationGraphAsListSchema = S.mutable(S.Array(RelationTripleSchema));
export type RelationGraphAsList = S.Schema.Type<typeof RelationGraphAsListSchema>;
export type RelationTriple<S extends string, P extends string> = Readonly<[
  subject: S,
  predicate: P,
  object: string,
]>;


/** Takes a list of `RelationTriple`s and returns it without duplicates. */
export function dedupeGraph(
  graph: RelationGraphAsList | Readonly<RelationGraphAsList>,
): RelationGraphAsList {
  const seen = new Set<string>();
  const newGraph: RelationGraphAsList = [];
  for (const triple of graph) {
    const key = triple.join(' ');
    if (!seen.has(key)) {
      seen.add(key)
      if (triple[0] !== triple[2]) {
        newGraph.push(triple);
      }
    } else {
    }
  }
  return newGraph;
}

/** Takes a list of relations and returns it without duplicates. */
export function dedupeResourceRelationList(
  rels: ResourceRelation[],
): ResourceRelation[] {
  const seen = new Set<string>();
  const newRels: ResourceRelation[] = [];
  for (const rel of rels) {
    const key = JSON.stringify(rel);
    if (!seen.has(key)) {
      seen.add(key)
      newRels.push(rel);
    } else {
    }
  }
  return newRels;
}


// We’re not using object representation for graphs,
// and also the below code should work but has a typing issue in reduce().


// /**
//  * Object’s relations, resolved recursively except objects
//  * that contributed to site hierarchy.
//  *
//  * For example, assuming hierarchy has “urn:obj:X” in it somewhere:
//  * {
//  *  type: clause,
//  *  hasPart: {
//  *   type: title,
//  *   hasPart: [
//  *    "Hello",
//  *    { type: link, seeAlso: urn:obj:X, hasPart: "Link" },
//  *    "to World",
//  *   ],
//  *  },
//  * }
//  *
//  * Don’t use this for now.
//  *
//  * Since we rely on relation order, this model doesn’t work:
//  * if there are hasText interspersed by hasPart,
//  * then they will be grouped under different keys and forget
//  * the original order.
//  */
// export const RelationGraphAsObjectSchema = S.Struct({
//   '@id': S.String.pipe(S.nonEmptyString()),
//   //'@type': S.String.pipe(S.nonEmptyString()),
// }).pipe(S.extend(S.Record({
//   key: S.String,
//   value: S.Union(
//     S.String.pipe(S.nonEmptyString()),
//     S.suspend((): S.Schema<IRelationGraphAsObject> =>
//       RelationGraphAsObjectSchema
//     ),
//     S.Array(S.Union(
//       S.String.pipe(S.nonEmptyString()),
//       S.suspend((): S.Schema<IRelationGraphAsObject> =>
//         RelationGraphAsObjectSchema)
//     )),
//   ),
// })));
// 
// export type RelationGraphAsObject = S.Schema.Type<typeof RelationGraphAsObjectSchema>;
// 
// interface IRelationGraphAsObject {
//   '@id': string;
//   [predicate: string]: string | IRelationGraphAsObject | readonly (string | IRelationGraphAsObject)[];
// }

// export function graphListToObject(
//   graph: RelationTriple<string, string>[],
//   /** Triples can have _:root for root node, so callers need to give an ID. */
//   root: string,
// ): RelationGraphAsObject {
//   return {
//     // Pick root relations
//     ...graph.
//     filter(rel => rel[0] === '_:root' || rel[0] === root).
//     map(([sRoot, pred, target]) => {
//       // TODO: Check if target is an URI maybe
//       // Is related object a subject elsewhere in the graph?
//       const subgraphForTarget = graph.filter(([s, ]) => s === target);
//       if (pred === 'hasLanguage') {
//         console.debug('has language', sRoot, target);
//       }
//       return {
//         [pred]: subgraphForTarget.length > 0
//           // If yes, render a graph without current root
//           // and using that target as new root.
//           ? graphListToObject(
//               graph.filter(([s, ]) => s !== sRoot).
//                 map(([s, p, o]) => [(s === target ? '_:root' : s), p, o]),
//               target)
//           // Otherwise, just render object as value
//           : target,
//       };
//     }).
//     reduce((prev, curr) => {
//       const predicate = Object.keys(curr)[0]!;
//       if (prev[predicate] !== undefined) {
//         if (Array.isArray(prev[predicate])) {
//           return { ...prev, [predicate]:
//             [ ...prev[predicate], curr[predicate] ] } as RelationGraphAsObject;
//         } else {
//           return { ...prev, [predicate]:
//             [ prev[predicate], curr[predicate] ] } as RelationGraphAsObject;
//         }
//       }
//       const combined = { ...prev, ...curr };
//       return combined as RelationGraphAsObject;
//     }, { '@id': root })
//   };
// }
// 
// export function graphObjectToList(
//   graphAsObject: RelationGraphAsObject,
//   subj_?: string,
//   graphSoFar_?: RelationGraphAsList,
// ): RelationGraphAsList {
//   const subj = subj_ ?? graphAsObject['@id'] ?? '_:root';
//   const newGraph: RelationGraphAsList = graphSoFar_ ?? [];
//   for (const [rawKey, target] of Object.entries(graphAsObject)) {
//     const key = rawKey === '@type' ? 'type' : rawKey;
//     if (key === '@id') {
//       continue;
//     }
//     function handleTarget(target: string | IRelationGraphAsObject | readonly (string | IRelationGraphAsObject)[]) {
//       if (target === undefined) {
//         console.warn("Converting object to list: got undefined target", rawKey, target);
//       } else if (typeof target === 'string') {
//         // Check if relation was already seen in the graph?
//         newGraph.push([subj, key, target] as RelationTriple<string, string>);
//       } else if (Array.isArray(target)) {
//         for (const v of target as (string | IRelationGraphAsObject)[]) {
//           handleTarget(v);
//         }
//       } else {
//         const obj = target as RelationGraphAsObject;
//         if (!obj['@id']) {
//           throw new Error("Cannot process relation graph object: subgraph is missing '@id', and we don’t infer blank nodes");
//         }
//         newGraph.push(...graphObjectToList(obj, obj['@id'], newGraph));
//       }
//     }
//     handleTarget(target);
//   }
//   return newGraph;
// }
