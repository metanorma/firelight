import {
  ROOT_SUBJECT,
  type RelationGraphAsList,
  type StoreAdapterModule,
} from 'anafero/index.mjs';

import {
  estimateRelationCount,
  processResources,
  dekebab,
  type CustomElementProcessor,
} from './util.mjs';


function urnFromID(id: string): string {
  return `urn:x-metanorma-xml-id:${id}`;
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


function mangleXMLIdentifier(id: string): string {
  return unescape(id.replaceAll('___x', '%u').replaceAll('__x', '%u'));
}

const sectionLikeElements = [
  'clause',
  'abstract',
  'references',
  'definitions',
  'terms',
  'annex',
] as const;

const mod: StoreAdapterModule = {
  name: 'Metanorma XML store adapter',
  version: '0.0.1',
  canResolve: (path) => path.endsWith('.xml'),
  readerFromBlob: async function (blob, helpers) {
    const dom = helpers.decodeXML(blob);

    const processClauseLike: CustomElementProcessor =
    function processClauseLike(el: Element) {
      return [
        [[
          ROOT_SUBJECT,
          'hasClauseIdentifier',
          mangleXMLIdentifier(
            el.getAttribute('id')
            ?? `unidentified-section-${crypto.randomUUID()}`
          ),
        ], [
          ROOT_SUBJECT,
          'type',
          'section',
        ]],
        {
          getChildPredicate: () => 'hasPart',
        },
      ];
    }

    const processAsGenericContainer: CustomElementProcessor =
    function processGeneric() {
      return [[], { getChildPredicate: () => 'hasPart' }];
    }

    function tagNameToHasPredicate(tagName: string): string {
      return `has${dekebab(tagNameAliases[tagName] ?? tagName)}`;
    }

    /**
     * For these tags, children are output
     * not via hasPart but via has<child tag name>.
     */
    const TAGS_WITH_DIRECT_CHILDREN_NOT_AS_GENERIC_PARTS: string[] = [
      'bibdata',
      'bibitem',
      'figure',
      'image',
      'table',
      'colgroup',
      'thead',
      'tbody',
      'tr',
    ];

    const TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS: string[] = [
      'bibdata',
      'bibitem',
    ];
    const TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS_SELECTOR =
      TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS.join(', ');

    return [
      [],
      {
        estimateRelationCount: () => estimateRelationCount(dom),
        discoverAllResources: (onRelationChunk, opts) => {
          processResources(dom, onRelationChunk, {
            getResourceURIFromID: urnFromID,
            getChildPredicate: function getChildPredicate(el: Element, childEl: Element) {
              if (TAGS_WITH_DIRECT_CHILDREN_NOT_AS_GENERIC_PARTS.includes(el.tagName)
                  || childEl.closest(TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS_SELECTOR)) {
                return tagNameToHasPredicate(childEl.tagName);
              }
              return undefined;
            },
            resourceTypesByTagName: tagNameAliases,
            processTag: {
              [dom.documentElement.tagName]: function processRootTag() {
                return [
                  [[ROOT_SUBJECT, 'type', 'document']],
                  {
                    getChildPredicate: (_, childEl) =>
                      childEl.tagName === 'bibdata'
                        ? tagNameToHasPredicate(childEl.tagName)
                        : 'hasPart',
                  },
                ];
              },
              abstract: function processAbstract(el, getURI) {
                if (!el.closest('bibdata')) {
                  return processClauseLike(el, getURI);
                } else {
                  return processAsGenericContainer(el, getURI);
                }
              },
              formattedref: processAsGenericContainer,
              span: processAsGenericContainer,
              clause: function processClause(el, getURI) {
                if (el.getAttribute('type') === 'toc') {
                  return [[], false];
                } else {
                  return processClauseLike(el, getURI);
                }
              },
              introduction: processClauseLike,
              foreword: processClauseLike,
              references: processClauseLike,
              terms: processClauseLike,
              annex: processClauseLike,
              definitions: processClauseLike,
              xref: function processXref(el) {
                const maybeTarget = el.getAttribute('target');
                const graph: RelationGraphAsList = [];
                if (!maybeTarget) {
                  console.warn("Xref with no target", el);
                } else {
                  graph.push([ROOT_SUBJECT, 'hasTarget', urnFromID(maybeTarget)]);
                }
                return [graph, { processAttribute: { target: 'skip' } }];
              },
              stem: function processStem(el) {
                return [
                  [[ROOT_SUBJECT, 'hasMathML', el.querySelector('math')!.outerHTML]],
                  { skipChildren: () => true },
                ];
              },
              title: function processTitle(el, getURI) {
                if (el.parentElement
                    && sectionLikeElements.includes(el.parentElement.tagName as any)) {
                  const sectionURI = getURI(el.parentElement);
                  const clauseNumber = el.querySelector('tab')
                    ? el.childNodes[0]?.textContent ?? ''
                    : '';
                  const graph: RelationGraphAsList = [];
                  if (clauseNumber.trim() !== '') {
                    graph.push([sectionURI, 'hasClauseNumber', clauseNumber]);
                  }

                  const parts = Array.from(el.childNodes).
                  //filter(n => n.nodeType === 3). // can’t only select text nodes, titles allow complex content
                  map(n => n.textContent ?? '').
                  filter(content => content !== '' && content !== clauseNumber);

                  if (parts.length > 0) {
                    for (const part of parts) {
                      graph.push([ROOT_SUBJECT, 'hasPart', part]);
                    }
                  } else {
                    throw new Error("Processing title: no content found!");
                  }
                  return [graph, { skipChildren: () => true }];
                } else {
                  return [[], true];
                }
              },
              svg: function processSVG(el) {
                return [
                  [[ROOT_SUBJECT, 'hasSVGContents', el.outerHTML]],
                  { skipChildren: () => true },
                ];
              },
              preface: 'bypass',
              sections: 'bypass',
              bibliography: 'bypass',
              metanorma: 'ignore',
              'localized-strings': 'ignore',
              'presentation-metadata': 'ignore',
            },
          }, opts);
        },
      },
    ];
  },
};

export default mod;
