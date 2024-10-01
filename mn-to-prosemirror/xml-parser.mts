// This module is kept as much in sync with prosemirror-model/from_dom
// as possible and follows its coding style, not Firelight’s style,
// for ease of adopting upstream changes.
// Do not deviate, unless ProseMirror’s side is refactored for ease of reuse.


// Parser
// ======

import { DOMParser } from 'prosemirror-model';
import type {
  Schema,
  ParseRule,
  StyleParseRule,
  TagParseRule,
} from 'prosemirror-model';

/**
 * A special tag, respected by MetanormaXMLDOMParser,
 * that indicates we take the root element whatever it is
 * without having to specify the exact tag.
 *
 * This is needed because MN XML root element is different
 * for different standard types, and we don’t want to generalize.
 */
export const TAKE_THE_ROOT_TAG = 'take_the_root_tag';

/**
 * Converts Metanorma XML DOM into a ProseMirror structure.
 *
 * See also MetanormaDOMSerializer for the reverse.
 *
 * This subclass only overrides stock DOMParser in that it uses
 * the `parseMetanormaDOM` rather than `parseDOM`, which is overall the same
 * except with support for a special rule indicating to just take
 * whatever root tag is available.
 */
export class MetanormaDOMParser extends DOMParser {
 static schemaRules(schema: Schema) {
   let result: ParseRule[] = []
   function insert(rule: ParseRule) {
     let priority = rule.priority == null ? 50 : rule.priority, i = 0
     for (; i < result.length; i++) {
       let next = result[i], nextPriority = next.priority == null ? 50 : next.priority
       if (nextPriority < priority) break
     }
     result.splice(i, 0, rule)
   }

    // TODO: Do we need to support marks in MN XML?
   for (let name in schema.marks) {
     // Modified line. We use parseMetanormaDOM instead of parseDOM,
     // and we need to type it explicitly since we don’t have a whole
     // custom Schema interface.
     let rules: readonly ParseRule[] | undefined = schema.marks[name].spec.parseMetanormaDOM
     if (rules) rules.forEach(rule => {
       insert(rule = copy(rule) as ParseRule)
       if (!(rule.mark || rule.ignore || (rule as StyleParseRule).clearMark))
         rule.mark = name
     })
   }
   for (let name in schema.nodes) {
     // Modified line. We use parseMetanormaDOM instead of parseDOM,
     // and we need to type it explicitly since we don’t have a whole
     // custom Schema interface.
     let rules: readonly ParseRule[] | undefined = schema.nodes[name].spec.parseMetanormaDOM
     if (rules) rules.forEach(rule => {
       insert(rule = copy(rule) as TagParseRule)
       if (!((rule as TagParseRule).node || rule.ignore || rule.mark))
         rule.node = name
     })
   }
   return result
 }
};

/** Copies prosemirror-model’s internal `from_dom.copy`. */
function copy(obj: {[prop: string]: any}) {
  let copy: {[prop: string]: any} = {}
  for (let prop in obj) copy[prop] = obj[prop]
  return copy
}


// Serializer
// ==========

import { DOMSerializer } from 'prosemirror-model';
import type {
  Node,
  Mark,
  NodeType,
  MarkType,
  DOMOutputSpec,
} from 'prosemirror-model';

/**
 * Converts a ProseMirror structure into Metanorma XML DOM.
 *
 * See also MetanormaDOMParser for the reverse.
 *
 * This subclass only overrides stock DOMParser in that it uses
 * the `parseMetanormaDOM` rather than `parseDOM`, which is overall the same
 * except with support for a special rule indicating to just take
 * whatever root tag is available.
 */
export class MetanormaDOMSerializer extends DOMSerializer {
  /// Gather the serializers in a schema's node specs into an object.
  /// This can be useful as a base to build a custom serializer from.
  static nodesFromSchema(schema: Schema) {
    let result = gatherToMetanormaDOM(schema.nodes)
    if (!result.text) result.text = node => node.text
    return result as {[node: string]: (node: Node) => DOMOutputSpec}
  }

  /// Gather the serializers in a schema's mark specs into an object.
  static marksFromSchema(schema: Schema) {
    return gatherToMetanormaDOM(schema.marks) as {[mark: string]: (mark: Mark, inline: boolean) => DOMOutputSpec}
  }
}

/** Copies prosemirror-model’s internal `to_dom.gatherToDOM`. */
function gatherToMetanormaDOM(obj: {[node: string]: NodeType | MarkType}) {
  let result: {[node: string]: (value: any, inline: boolean) => DOMOutputSpec} = {}
  for (let name in obj) {
    let toDOM = obj[name].spec.toMetanormaDOM
    if (toDOM) result[name] = toDOM
  }
  return result
}
