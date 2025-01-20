import {
  ROOT_SUBJECT,
  type RelationTriple,
  type RelationGraphAsList,
} from 'anafero/index.mjs';


export function estimateRelationCount(doc: Document): number {
  let current: Element | null = doc.documentElement;
  let count = 0;
  const processed = new Set<Element>();
  while (current !== null) {

    if (!processed.has(current)) {
      // Count element itself
      count += 1;

      // Count attributes,
      // since each attribute is a relation
      count += current.attributes.length;

      processed.add(current);
    }

    // Move on to the next, which will be one of:
    // 1) the first child element
    // if current is A, that may be B:
    //
    // TOP
    // |
    // •—A——•—B <- new current
    // |    |
    // |    C
    // |
    // D
    //
    // 2) the next sibling element
    // next iteration, B has no children, so pick C:
    //
    // TOP
    // |
    // •—A——•—B
    // |    |
    // |    C <- new current
    // |
    // D
    //
    // 3) parent’s next sibling
    // next iteration, C has no next sibling, so pick D:
    //
    // TOP
    // |
    // •—A——•—B
    // |    |
    // |    C
    // |
    // D <- new current
    //
    // 4) nothing, because we’re probably finished.
    //
    // processResources() uses a similar technique.
    // Not recursing is probably faster.
    current =
      (current.firstElementChild && !processed.has(current.firstElementChild)
        ? current.firstElementChild
        : null)
      ?? current.nextElementSibling
      ?? current.parentElement
      ?? null;
  }
  return count;
}

/**
 * Ensures that resources for which we auto-generate random IDs
 * (where elements don’t have IDs) have consistent IDs throughout the run.
 */
const RESOURCE_URI_MAP: Map<Element, string> = new Map();

const REPORT_EVERY_N = 200;

const RETURNED_RELATION_CHUNK_SIZE = 1000;

/** Rules for how XML is processed into resources. */
interface Rules {

  /** Override default URI generation. */
  getResourceURI?: (el: Element) => string | undefined;

  /** Override default URI generation based on ID attribute. */
  getResourceURIFromID?: (id: string) => string | undefined;

  /** Skip element subtree, but process the element itself. */
  skipChildren?: (el: Element) => boolean;

  /** Customize attribute processing. As of now just skipping is possible. */
  processAttribute?: Record<string, 'skip'>;

  /**
   * What string to output as resource’s type for particular tagName.
   * The default behavior is to use the tagName directly.
   */
  resourceTypesByTagName?: Record<string, string>;

  /**
   * By default, a child is related to the part via generic hasPart.
   * This can customize that.
   *
   * Returning undefined means default behavior.
   */
  getChildPredicate?: (el: Element, childEl: Element) => string | undefined;

  /**
   * Maps tag names (or wildcard) to custom processing function.
   *
   * Custom processing function can return some graph
   * and a marker instructing whether and how to do default processing as well.
   *
   * If necessary, it can traverse DOM to parents and output relations
   * *for them*, but think of performance.
   *
   * Ignore means do not output anything for the element and its subtree.
   * Bypass means skip the element but process the tree as if the element
   * didn’t exist.
   */
  processTag?: Record<string, 'ignore' | 'bypass' | CustomElementProcessor>;

}

export type CustomElementProcessor = (
  el: Element,
  /**
   * Get resource URI of another element,
   * in case processor wants to output relations for it.
   */
  getURI: (el: Element) => string,
) => readonly [
  graph: RelationGraphAsList,
  /** Return:
   * - false if the element is not to be processed in any other way
   * - true to proceed with default processing (see processResource())
   * - a Rules object to determine how to do processing
   *   (then true is implied)
   */
  doDefaultProcessing: boolean | Rules,
]

export function processResources(
  doc: Document,
  onRelationChunk: (relations: readonly RelationTriple<any, any>[]) => void,
  rules: Rules,
  opts: { onProgress: (msg: string) => void },
) {
  function getURI_(el: Element) {
    if (!RESOURCE_URI_MAP.has(el)) {
      RESOURCE_URI_MAP.set(
        el,
        (el === doc.documentElement)
          ? '_:root'
          : getURI(el, rules.getResourceURI, rules.getResourceURIFromID),
      );
    }
    return RESOURCE_URI_MAP.get(el)!;
  }

  let current: Element | null = doc.documentElement;
  const currentChain: string[] = [repr(current)];

  const processed = new Set<Element>();

  let sinceLastReport = 0;

  const chunk: Map<RelationTriple<any, any>, true> = new Map();

  while (current !== null) {
    if (sinceLastReport > REPORT_EVERY_N) {
      opts.onProgress(currentChain[currentChain.length - 1]!);
      sinceLastReport = 0;
    } else {
      sinceLastReport += 1;
    }

    const firstChild: Element | null = current.firstElementChild;
    if (firstChild && !processed.has(firstChild) && rules.processTag?.[firstChild.tagName] !== 'ignore') {
      current = firstChild;
      currentChain.push(repr(firstChild));
    } else {
      // There are no child elements. The resource can be related
      // to resources from elsewhere in the tree through attributes though.

      if (processed.has(current)) {
        throw new Error("Encountered an already processed element");
      }
      const rule = rules.processTag?.[current.tagName];
      if (rule !== 'ignore' && rule !== 'bypass') {
        const [localGraph, doDefaultProcess] = rule
          ? rule(current, getURI_)
          : [[], true];
        if (doDefaultProcess !== false) {
          const rules_ = doDefaultProcess !== true
            ? { ...rules, ...doDefaultProcess }
            : rules;
          localGraph.push(
            ...processResource(current, getURI_, rules_)
          );
        }
        const uri = getURI_(current);
        // Replace blank root subject with actual element URI in the graph
        const graph: RelationGraphAsList = localGraph.map(([s, p, o]) => [
          s === ROOT_SUBJECT ? uri : s,
          p,
          o,
        ]);
        // FIXME: Make sure a triple does not appear twice
        graph.map(rel => chunk.set(rel, true));
        processed.add(current);
      }

      if (chunk.size > RETURNED_RELATION_CHUNK_SIZE) {
        onRelationChunk(Array.from(chunk.keys()));
        chunk.clear();
      }

      if (current.nextElementSibling) {
        currentChain.pop();
        currentChain.push(repr(current.nextElementSibling));
      } else if (current.parentElement) {
        currentChain.pop();
      }

      current =
        current.nextElementSibling
        ?? current.parentElement
        ?? null;
    }
  }
  if (chunk.size > 0) {
    onRelationChunk(Array.from(chunk.keys()));
  }
  if (currentChain.length > 0) {
    console.warn("Leftover chain after XML processing loop", currentChain);
  }
}

function processResource(
  el: Element,
  getURI: (el: Element) => string,
  rules: Rules,
): Readonly<RelationGraphAsList> {

  const graph: RelationGraphAsList = [];

  // The type relation
  graph.push([
    ROOT_SUBJECT,
    'type',
    rules.resourceTypesByTagName?.[el.tagName] ?? el.tagName,
  ]);

  // Element attributes
  graph.push(
    ...Array.from(el.attributes).
    filter(attr => rules.processAttribute?.[attr.name] !== 'skip').
    map(attr => [
      ROOT_SUBJECT,
      `has${dekebab(attr.name)}`,
      attr.value
    ] as RelationTriple<any, any>)
  );

  if (!rules.skipChildren?.(el)) {
    addRelationsToChildren(el, graph, getURI, rules);
  }

  return graph;
}

function addRelationsToChildren(
  el: Element,
  graph: RelationGraphAsList,
  getURI: (el: Element) => string,
  rules: Pick<Rules, 'getChildPredicate' | 'processTag'>,
) {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3 && node.textContent !== null) {
      graph.push([ ROOT_SUBJECT, 'hasPart', node.textContent ]);
    } else if (node.nodeType === 1) {
      const childEl = node as Element;
      if (rules.processTag?.[childEl.tagName] === 'bypass') {
        // If this child is bypassed, we process its children instead,
        // relating it to parent URI as if they were direct descendants.
        addRelationsToChildren(childEl, graph, getURI, rules);
      } else {
        // NOTE: In case a parent was bypassed,
        // should we call getChildPredicate with original parent?
        // This possibly calls it with the “bypassed child” parent.
        const childPredicate = rules.getChildPredicate?.(el, childEl) ?? 'hasPart';
        graph.push([
          ROOT_SUBJECT,
          childPredicate,
          getURI(childEl),
        ]);
      }
    }
  }
}

const DEFAULT_URI_PREFIX = 'urn:x-xml-element:';

function getURI(
  el: Element,
  overrideURI: Rules['getResourceURI'],
  overrideURIFromID: Rules['getResourceURIFromID'],
): string {
  return overrideURI?.(el) ?? getURIDefault(el, overrideURIFromID);
}

function getURIDefault(
  el: Element,
  overrideURIFromID: Rules['getResourceURIFromID'],
) {
  const maybeID = el.getAttribute('id');
  const prefix = `${DEFAULT_URI_PREFIX}${el.tagName}`;
  return maybeID
    ? overrideURIFromID?.(maybeID) ?? `${prefix}#${maybeID}`
    : `${prefix}-${crypto.randomUUID()}`;
}


/**
 * Converts a possibly kebab-style string
 * to CamelCase (with first letter capitalized).
 *
 * Useful for cases like adapting dash-separated
 * DOM attribute or element names to RDF conventions.
 */
export function dekebab(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-./g, x => x[1]?.toUpperCase() ?? '');
}

function repr(el: Element) {
  const maybeID = el.getAttribute('id');
  return `${el.tagName}${maybeID ? `#${maybeID}` : ''}`;
}
