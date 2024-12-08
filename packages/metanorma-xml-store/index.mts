import xpath from 'xpath';

import {
  dedupeGraph,
  type ResourceRelation,
  type RelationTriple,
  type RelationGraphAsList,
  type StoreAdapterModule,
} from 'anafero/index.mjs';


const evaluate: typeof document['evaluate'] = (xpath as any).evaluate;

type ChildRelationHook = (parent: Element, child: Element) => {
  /**
   * What sort of relation to indicate.
   * Commonly used is “hasPart” for free-form document contents
   * and “has<tagName>” for more structured parts.
   */
  predicate: string;

  /**
   * If false, leaf elements are always expanded:
   * <organization><name>foo</name></organization> =>
   * - organization hasName X
   * - X hasPart foo
   *
   * If true, leaf element with no attributes becomes a single relation:
   * <organization><name>foo</name></organization> =>
   * - organization hasName foo
   *
   * In this case, predicate is ignored.
   * E.g. if our predicate is “hasPart”:
   * <clause><title>foo</title></clause> =>
   * - organization hasTitle foo
   */
  canCollapseLeaf: boolean;
};

type _ElementParser = (
  el: Element,
  root: string,
  getURI: (el: Element) => string,
  getChildRelation: ChildRelationHook,
  /** 0 means skip children. */
  recurse?: number,
) => Generator<RelationTriple<string, string>>;

type ElementParser = (
  el: Element,
  root: string,
  getURI: (el: Element) => string,
  getChildRelation: ChildRelationHook | undefined,
  /** 0 means skip children. */
  recurse?: number,
) => Generator<RelationTriple<string, string>>;

/** CamelCase (with first letter capitalized) from possibly kebab-style */
function dekebab(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-./g, x => x[1]?.toUpperCase() ?? '');
}

const tagNameAliases: Record<string, string> = {
  'p': 'paragraph',
  'ul': 'unorderedList',
  'ol': 'orderedList',
  'li': 'listItem',
  'tbody': 'tableBody',
  'thead': 'tableHeader',
  'table': 'table',
  'tr': 'tableRow',
  'th': 'tableHeaderCell',
  'td': 'tableCell',
  'g': 'pathGroup',
} as const;

const tagPredicateMap: Record<string, string> = {
  'clause': 'hasPart',
} as const;

//function clausePartPredicate(el: Element, childEl: Element): string {
//  return 'hasPart';
//}


function mangleXMLIdentifier(id: string): string {
  return unescape(id.replaceAll('___x', '%u').replaceAll('__x', '%u'));
}

function * parseAttributes(el: Element, root: string): Generator<RelationTriple<string, string>> {
  const xmlID = el.getAttribute('id');
  if (xmlID) {
    yield [root, 'hasXMLIdentifier', xmlID];
    //yield [root, 'hasIdentifier', mangleXMLIdentifier(xmlID)];
  }
  for (const attr of Array.from(el.attributes)) {
    const predicate = `has${dekebab(attr.name)}`;
    // <name foo-bar="baz"/> => name hasFooBar baz
    yield [root, predicate, attr.value];
  }
}

const defaultChildRelation: ChildRelationHook =
function defaultChildRelation(el, childEl) {
  const childTagName = tagNameAliases[childEl.tagName]
    ?? childEl.tagName;
  return {
    predicate: tagPredicateMap[childEl.tagName]
      ?? `has${dekebab(childTagName)}`,
    canCollapseLeaf: true,
  };
}

const bibdataChildRelation: ChildRelationHook =
function bibdataChildRelation(el, childEl) {
  const childTagName = tagNameAliases[childEl.tagName]
    ?? childEl.tagName;
  return {
    predicate: tagPredicateMap[childEl.tagName]
      ?? `has${dekebab(childTagName)}`,
    canCollapseLeaf: false,
  };
}

const clauseChildRelation: ChildRelationHook =
function clauseChildRelation(el, childEl) {
  if (childEl.tagName === 'title') {
    return { predicate: 'hasPart', canCollapseLeaf: false };
  } else {
    return { predicate: 'hasPart', canCollapseLeaf: true };
  }
}

const sectionLikeElements = [
  'clause',
  'abstract',
  'references',
  'terms',
] as const;

// interface TagRules {
//   [tagNameOrWildcard: string]: {
//     /**
//      * Generate an ID for this resource.
//      * If it returns null, the element
//      * is not treated as a resource (and neither are its children, if any).
//      */
//     identifyResource: (el: Element) => string | null;
//     children: TagRules;
//   };
// }
// const defaultTagRules: TagRules[string] = {
//   identifyResource: makeUpAURN,
//   children: {
//     '*': defaultTagRules,
//   },
// };
// 
// interface IndexOptions {
//   /** How to process a given tag. */
//   tagRules: TagRules;
// }
// 
// const metanormaRules = {
// };

///**
// * Outputs a map of resource ID to element describing that resource.
// * If element has children, will recurse into them.
// */
//function indexResources(elements: Element[], options: IndexOptions):
//Record<string, Element> {
//  return elements.map(el => {
//    const rules = options.tagRules[el.tagName] ?? defaultTagRules;
//    const resourceID = rules.makeID(el)
//    if (!resourceID) {
//      return {};
//    }
//  }).reduce((prev, curr) => ({ ...prev, ...curr }), {});
//}

const mod: StoreAdapterModule = {
  name: 'Metanorma XML store adapter',
  version: '0.0.1',
  canResolve: (path) => path.endsWith('.xml'),
  readerFromBlob: async function (blob, helpers) {
    const dom = helpers.decodeXML(blob);


    //const docidentifierURN = dom.querySelector('docidentifier[type="URN"]')?.textContent;
    function urnFromID(id: string): string {
      return `urn:metanorma-xml-id:${id}`;
    }

    function makeUpAURN(el: Element) {
      // fix for 10303
      //return `urn:uuid:${crypto.randomUUID()}`;

      const maybeID = el.getAttribute('id');
      if (maybeID) {
        return urnFromID(maybeID);
      } else {
        return `urn:uuid:${crypto.randomUUID()}`;
      }
    }



    /** Cache relations for each element URI. */
    const uriRelations: Record<string, RelationGraphAsList> = {};

    const parseElement: ElementParser =
    function * parseElement(
      el,
      root,
      getURI,
      getChildRelation,
      recurse,
    ) {
      if (el.tagName.startsWith('semantic__')) {
        console.warn("Ignoring semantic subtree");
        return;
      }
      //console.debug("Parsing", el.tagName, el.getAttribute('id'));
      if (uriRelations[root]) {
        yield * uriRelations[root];
      } else {
        const parser = elParsers[el.tagName] ?? _parseGenericElement;
        uriRelations[root] = dedupeGraph(Array.from(parser(
          el,
          root,
          getURI,
          getChildRelation ?? defaultChildRelation,
          recurse,
        )));
        yield * uriRelations[root];
      }
    }

    const _parseGenericElement: _ElementParser = function * _parseGenericElement (
      el,
      root,
      getURI,
      getChildRelation,
      recurse,
    ): Generator<RelationTriple<string, string>> {
      //const urn = getURI(el);
      const tagName = tagNameAliases[el.tagName] ?? el.tagName;
      // Emit the type
      yield [root, 'type', tagName];
      // Emit attribute relations
      yield * parseAttributes(el, root);

      if (recurse !== undefined && recurse < 1) {
        return;
      }
      // Emit children recursively
      for (const child of Array.from(el.childNodes).filter(n => n.nodeName !== 'tab')) {
        if (child.nodeType === 3 && child.textContent) {
          // A child can be a text node
          // <name>foo</name> => name hasPart foo
          yield [root, 'hasPart', child.textContent];
        } else if (child.nodeType === 1) {
          const childEl = child as Element;
          const { predicate, canCollapseLeaf } = getChildRelation(el, childEl);
          const childrenExcludingTabs = Array.from(child.childNodes).
            filter(n => n.nodeName !== 'tab');
          if (canCollapseLeaf
              && childEl.attributes.length < 1
              //&& childrenExcludingTabs.length === 1 // Child node text contents will be merged

              // Must make sure only text nodes are within
              && !childrenExcludingTabs.find(node => node.nodeType !== 3)) {
            // <organization><name>foo</name></organization> =>
            // - organization hasName foo
            //
            // and it ignores getPredicate(),
            // e.g. even if our getPredicate() returns hasPart title:
            // <clause><title>foo</title></clause> =>
            // - organization hasTitle foo
            if (child.textContent) {
              yield [root, predicate, child.textContent];
            }
          } else {
            // <organization><name type="foo">bar</name></organization> =>
            // - organization hasName X
            // - X hasType foo
            // - X hasPart bar
            const childURN = getURI(childEl);
            // Tell that the root “has” this child
            yield [root, predicate, childURN];
            // Emit child relations
            yield * parseElement(
              childEl,
              childURN,
              getURI,
              getChildRelation,
              recurse !== undefined ? recurse - 1 : recurse,
            );
          }
        }
      }
    }

    const elParsers: Record<string, _ElementParser> = {
      bibdata: function * (el, root, onURI, _, recurse) {
        yield * _parseGenericElement(el, root, onURI, (el, childEl) => {
          if (el.tagName === 'abstract' || el.closest('abstract')) {
            console.debug("Processing abstract in bibdata el parser");
          }
          return el.tagName === 'abstract' || el.closest('abstract')
            ? clauseChildRelation(el, childEl)
            : bibdataChildRelation(el, childEl)
        }, recurse);
      },
      //'doc-container': function * (el, root, onURI, _, recurse) {
      //  yield [root, 'type', 'document'];
      //  //yield * parseAttributes(el, root);
      //  yield * _parseGenericElement(el.children[0]!, root, onURI, clauseChildRelation);
      //},
      //entry: function * (el, root, onURI, _, recurse) {
      //  yield [root, 'hasCollectionEntryIdentifier', el.querySelector('identifier')!.textContent!];
      //},
      bibitem: function * (el, root, onURI, _, recurse) {
        yield * _parseGenericElement(el, root, onURI, (el, childEl) => {
          return el.tagName === 'formattedref' || el.closest('formattedref')
            ? clauseChildRelation(el, childEl)
            : defaultChildRelation(el, childEl)
        }, recurse);
      },
      dl: function * (el, root, onURI, _, recurse) {
        yield * parseAttributes(el, root);
        yield * _parseGenericElement(el, root, onURI,
          () => ({ predicate: 'hasPart', canCollapseLeaf: false }));
      },
      xref: function * (el, root, onURI, _, recurse) {
        const maybeTarget = el.getAttribute('target');
        if (!maybeTarget) {
          console.warn("No xref target", el, root);
        } else {
          for (const [s, p, o] of parseAttributes(el, root)) {
            if (p === 'hasTarget') {
              yield [s, p, urnFromID(o)];
            } else {
              yield [s, p, o];
            }
          }
        }
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, 3);
      },
      title: function * (el, root, onURI, _, recurse) {
        if (el.parentElement
            && sectionLikeElements.includes(el.parentElement.tagName as any)) {
          // Direct descendant of a section
          // Emit the type
          yield [root, 'type', 'title'];
          // Emit attribute relations
          yield * parseAttributes(el, root);
          const fullTitle = el.textContent;
          const sectionURI = onURI(el.parentElement);
          if (fullTitle) {
            yield [sectionURI, 'hasLabel', fullTitle];
            const clauseNumber = el.querySelector('tab')
              ? el.childNodes[0]?.textContent ?? ''
              : '';
            if (clauseNumber.trim() !== '') {
              yield [sectionURI, 'hasClauseNumber', clauseNumber];
            }
            const parts = Array.from(el.childNodes).
              filter(n => n.nodeType === 3).
              map(n => n.textContent ?? '').
              filter(content => content !== '' && content !== clauseNumber);
            if (parts.length > 0) {
              for (const part of parts) {
                yield [root, 'hasPart', part];
              }
            } else {
              throw new Error("Processing title: no content found!");
            }
          }
        } else {
          yield * _parseGenericElement(el, root, onURI, _, recurse);
        }
      },
      figure: function * (el, root, onURI, _, recurse) {
        // For now, not supporting nested content in figures.
        yield [root, 'type', 'figure'];
        yield * parseAttributes(el, root);
        yield * _parseGenericElement(el, root, onURI, defaultChildRelation, 3);
      },
      table: function * (el, root, onURI, _, recurse) {
        yield [root, 'type', 'table'];
        yield * parseAttributes(el, root);
        yield * _parseGenericElement(el, root, onURI, defaultChildRelation);
      },
      td: function * (el, root, onURI, _, recurse) {
        yield [root, 'type', 'tableCell'];
        yield * parseAttributes(el, root);
        //// infer colwidth
        //const colgroupEl = Array.from(el.closest('table')!.children).
        //  find(el => el.tagName === 'colgroup');
        //if (colgroupEl) {
        //  const colWidths = colgroupEl.
        //  const cellIdx = Array.prototype.indexOf.call(el.parentNode!.childNodes, el);
        //  const colspan = el.getAttribute('colspan') ?? 1;
        //}
        //yield [root, 'hasColwidth', 'tableCell'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation);
      },
      svg: function * (el, root, onURI, _, recurse) {
        yield * _parseGenericElement(el, root, onURI, defaultChildRelation, 0);
        console.warn("Not parsing SVG contents");
        yield [root, 'hasSVGContents', el.outerHTML];
      },
      stem: function * (el, root, onURI, _, recurse) {
        yield * _parseGenericElement(el, root, onURI, defaultChildRelation, 0);
        console.warn("Not parsing stem (math?) contents");
        yield [root, 'hasMathML', el.querySelector('math')!.outerHTML];
      },
      abstract: function * (el, root, onURI, _, recurse) {
        if (!el.closest('bibdata')) {
          yield [
            root,
            'hasClauseIdentifier',
            mangleXMLIdentifier(el.getAttribute('id') ?? '??'),
          ];
          yield [root ?? '_:root', 'type', 'section'];
        }
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
      clause: function * (el, root, onURI, _, recurse) {
        yield [
          root,
          'hasClauseIdentifier',
          mangleXMLIdentifier(el.getAttribute('id')!)];
        yield [root ?? '_:root', 'type', 'section'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
      terms: function * (el, root, onURI, _, recurse) {
        yield [
          root,
          'hasClauseIdentifier',
          mangleXMLIdentifier(el.getAttribute('id')!)];
        yield [root ?? '_:root', 'type', 'section'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
      foreword: function * (el, root, onURI, _, recurse) {
        yield [
          root,
          'hasClauseIdentifier',
          mangleXMLIdentifier(el.getAttribute('id')!)];
        yield [root ?? '_:root', 'type', 'section'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
      introduction: function * (el, root, onURI, _, recurse) {
        yield [
          root,
          'hasClauseIdentifier',
          mangleXMLIdentifier(el.getAttribute('id')!)];
        yield [root ?? '_:root', 'type', 'section'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
      references: function * (el, root, onURI, _, recurse) {
        yield [
          root,
          'hasClauseIdentifier',
          mangleXMLIdentifier(el.getAttribute('id')!)];
        yield [root ?? '_:root', 'type', 'section'];
        yield * _parseGenericElement(el, root, onURI, clauseChildRelation, recurse);
      },
    };

    const rootTag = dom.documentElement.tagName;
    console.debug("Got doc", rootTag);

    // Smoke test
    const bibdata = dom.querySelector('bibdata');
    const docidentifier = bibdata?.querySelector('docidentifier');
    const docidentifierText = docidentifier?.textContent;
    if (!docidentifierText) {
      throw new Error("Missing bibdata or a proper docidentifier");
    }

    console.debug("Got bibdata with docidentifier", docidentifierText);



    const entryRoot = dom.querySelector('entry');

    if (entryRoot && rootTag !== 'metanorma-collection') {
      throw new Error("Collections must use <metanorma-collection> root and have some entries");
    }

    const [rootRelations, elementsByURI] = entryRoot
      ? getRootRelationsForCollection()
      : getRootRelationsForDocument();

    function getRootRelationsForCollection() {
      const entries = dom.querySelectorAll('entry[fileref]');
      const elementsByURI = Array.from(entries).map(el =>
        ({ [makeUpAURN(el)]: el })
      ).reduce((prev, curr) => ({ ...prev, ...curr }), {});
      return [
        [
          { predicate: 'type', target: 'document' },
          ...Array.from(Object.entries(elementsByURI)).
            map(([, el]) => ({
              predicate: 'hasPart',
              target: `file:${el.getAttribute('fileref')}`,
            })),
        ],
        elementsByURI,
      ] as [ResourceRelation[], Record<string, Element>];
    }

    function getRootRelationsForDocument() {
      const highLevelSectioningContainers = Array.from(iterateElements(
        './preface | ./sections | ./annex | ./bibliography',
        dom.documentElement,
      ));

      const elementsByURI = highLevelSectioningContainers.
        map(getStructuralDescendants).
        flatMap(nodeList =>
          Array.from(nodeList).
          filter(el => (el.getAttribute('id') ?? '').trim() !== '')
        ).
        map(el => ({ [makeUpAURN(el)]: el }) as { [key: string]: Element }).
        reduce((prev, curr) => ({ ...prev, ...curr }), {});

      // High-level sections
      const parts = Array.from(Object.entries(elementsByURI));

      console.debug(
        "Got top-level sections",
        parts.map(([uri, el]) => [el.tagName, el.getAttribute('id'), uri]));

      //// Pre-process doc
      //for (const [, el] of parts) {
      //  for (const [subpartURI, subpartEl] of generateParts(el)) {
      //    elementsByURI[subpartURI] = subpartEl;
      //  }
      //}
      //for (const el of Array.from(iterateElements('./*', dom.documentElement))) {
      //  const uri = getURI(el);
      //  console.debug("Processing part contents", el.tagName, el.getAttribute('id'), uri);
      //  Array.from(
      //    parseElement(el, uri, getURI, 5000));
      //}

      console.debug("Outputting root relations for document", parts.map(([partURI, ]) => ({ predicate: 'hasPart', target: partURI })));
      
      return [
        [
          { predicate: 'type', target: 'document' },
          ...parts.map(([partURI, ]) => ({ predicate: 'hasPart', target: partURI })),
        ],
        elementsByURI,
      ] as [ResourceRelation[], Record<string, Element>];
    }

    const bibdataURI = `urn:relaton:${encodeURIComponent(docidentifierText)}`;
    rootRelations.splice(0, 0, { predicate: 'hasBibdata', target: bibdataURI });
    elementsByURI[bibdataURI] = bibdata!;


    function getURI(el: Element): string {
      // We can do this because DOM elements compare by reference,
      // not very efficient though:
      const preAssigned = Object.entries(elementsByURI).find(([, e]) => e === el);
      if (preAssigned) {
        //if (preAssigned[1].tagName !== el.tagName) {
        //  console.error("Have URI for matching element but another tagName");
        //  console.debug("Have an URI", preAssigned[1].tagName, preAssigned[0], el.tagName);
        //  throw new Error();
        //}
        return preAssigned[0];
      } else {
        const newlyAssigned = makeUpAURN(el);
        elementsByURI[newlyAssigned] = el;
        return newlyAssigned;
      }
    }

    return [
      rootRelations,
      {
        resourceExists: (uri) => elementsByURI[uri] !== undefined,
        resolveRelations: async function * resolveRelations (uri, recurseUpTo) {
          if (uri === '') {
            for (const rel of rootRelations) {
              yield rel;
            }
          } else {
            const el = elementsByURI[uri];
            if (el) {
              const rels = parseElement(el, uri, getURI, undefined, recurseUpTo);
              //console.debug("Resolve relations", uri);
              //const rels = uriRelations[uri]!
              for (const [s, p, o] of rels) {
                if (s === uri) {
                  //console.debug("Emitting relation", s, p, o);
                  yield { predicate: p, target: o };
                }
              }
            } else {
              console.error("Cannot resolve relations: no such element", uri);
              return;
            }
          }
        },
        resolveRelation: async (uri, pred) => {
          //console.debug("Resolving relation", uri, pred);
          if (uri === '') {
            return rootRelations.
              filter(rel => rel.predicate === pred).
              map(rel => rel.target)
              ?? [];
          }
          const el = elementsByURI[uri];
          if (el) {
            const rels = parseElement(el, uri, getURI, undefined);
            //console.debug("Resolve relation", uri);
            //const rels = uriRelations[uri]!;
            const values: string[] = [];
            for (const [s, p, o] of rels) {
              if (s === uri && p === pred) {
                values.push(o);
              }
            }
            if (values.length < 1) {
              //console.warn("No values found for predicate", uri, pred);
            } else {
              //console.warn("Values found for predicate", uri, pred, values);
            }
            return values;
          } else {
            console.error("Cannot resolve relation: no such element", uri);
            return [];
          }
        },
      },
    ];
  },
};

export default mod;


/** Generates elements based on XPath query. */
function * iterateElements(query: string, context: Element) {
  let result_type = XPathResult.ORDERED_NODE_SNAPSHOT_TYPE;

  let results = evaluate(
    query,
    context,
    null,
    result_type);

  for (let i = 0; i < results.snapshotLength; i++) {
    const node = results.snapshotItem(i);
    if (node?.nodeType === 1) {
      yield node as Element;
    }
  }
}

function getStructuralDescendants(el: Element) {
  return Array.from(iterateElements(`
      ./abstract
    | ./clause[not(@type='toc')]
    | ./annex
    | ./definitions
    | ./references
    | ./terms
    | ./acknowledgements
  `, el));
}
