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
  type Rules,
} from './util.mjs';


const sectionLikeElements = [
  'clause',
  'abstract',
  'references',
  'definitions',
  'terms',
  'annex',
  'indexsect',
] as const;

const tagNameAliases: Record<string, string> = {
  'p': 'paragraph',
  'fn': 'footnote',
  'ul': 'unorderedList',
  'ol': 'orderedList',
  'li': 'listItem',
  'tbody': 'tableBody',
  'thead': 'tableHeader',
  'tfoot': 'tableFooter',
  'table': 'table',
  'tr': 'tableRow',
  'th': 'tableHeaderCell',
  'td': 'tableCell',
  'g': 'pathGroup',
} as const;

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
  'tfoot',
  'tr',
  'bibitem',
] as const;

const TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS: string[] = [
  'bibdata',
] as const;
const TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS_SELECTOR =
  TAGS_WITH_ALL_CHILDREN_NOT_AS_GENERIC_PARTS.join(', ');

function mangleXMLIdentifier(id: string): string {
  return unescape(id.replaceAll('___x', '%u').replaceAll('__x', '%u'));
}

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

function urnFromID(id: string): string {
  return `urn:metanorma:doc-part:${id}`;
}

function getResourceURI(el: Element): string {
  const maybeID = el.getAttribute('id');
  const prefix = `urn:metanorma:doc-part-unstable:${el.tagName}`;
  return maybeID
    // We have a proper (hopefully stable) ID
    ? urnFromID(maybeID)
    // We need to make up an ID
    : `${prefix}-${crypto.randomUUID()}`;
}

const mod: StoreAdapterModule = {
  name: 'Metanorma XML store adapter',
  version: '0.0.1',
  canResolve: (path) => path.endsWith('.xml'),
  readerFromBlob: async function (blob, helpers) {
    const dom = helpers.decodeXML(blob);

    if (!(
      dom.documentElement.tagName === 'metanorma'
      && dom.documentElement.getAttribute('type') === 'presentation'
      && dom.querySelector('bibdata docidentifier[primary="true"]')?.textContent
    )) {
      throw new Error("Not a valid Metanorma presentation XML file");
    }

    return [
      [],
      {
        estimateRelationCount: () => estimateRelationCount(dom),
        discoverAllResources: (onRelationChunk, opts) => {
          processResources(dom, onRelationChunk, {
            getResourceURIFromID: urnFromID,
            getResourceURI,
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
                ] as [RelationGraphAsList, Rules];
              },
              fn: function processFootnote() {
                // Leave default processing, but strip IDs from children
                return [
                  [],
                  {
                    processAttribute: { id: 'skip' },
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
              span: (el, _) =>
                ['fmt-autonum-delim', 'fmt-caption-label', 'fmt-caption-delim'].
                map(t => el.classList.contains(t)).
                includes(true)
                  ? 'bypass'
                  : processAsGenericContainer(el, _),
              clause: function processClause(el, getURI) {
                if (el.getAttribute('type') === 'toc') {
                  return [[], false];
                } else {
                  return processClauseLike(el, getURI);
                }
              },
              introduction: processClauseLike,
              foreword: processClauseLike,
              indexsect: processClauseLike,
              references: processClauseLike,
              terms: processClauseLike,
              annex: processClauseLike,
              definitions: processClauseLike,
              xref: 'ignore',
              'fmt-xref': function processXref(el) {
                const maybeTarget = el.getAttribute('target');
                const graph: RelationGraphAsList = [];
                if (!maybeTarget) {
                  console.warn("Xref with no target", el);
                } else {
                  graph.push([ROOT_SUBJECT, 'hasTarget', urnFromID(maybeTarget)]);
                }
                return [graph, { processAttribute: { target: 'skip' } }];
              },

              // These two are covered by the table located inside the fmt-provision
              requirement: 'bypass',
              'fmt-provision': 'bypass',

              stem: function processStem(el) {
                return [
                  [[ROOT_SUBJECT, 'hasMathML', el.querySelector('math')!.outerHTML]],
                  { skipChildren: () => true },
                ];
              },
              sourcecode: function processSourceCode(el) {
                return [
                  [[ROOT_SUBJECT, 'hasFormattedSource', Array.from(el.childNodes).map(node =>
                    node.nodeType === 3
                      ? node.nodeValue
                      : node.nodeType === 1
                        ? (node as Element).tagName.startsWith('fmt-')
                          // Ignore the fmt-* tags preceding actual source listing
                          ? ''
                          : (node as Element).outerHTML
                        : ''
                  ).join('')]],
                  { skipChildren: () => false, processTag: { span: 'ignore' } },
                ];
              },
              semx: 'bypass',
              eref: 'bypass',
              origin: 'ignore',
              source: 'bypass',
              title: function processTitle(el, getURI) {
                if (el.parentElement
                    && sectionLikeElements.includes(el.parentElement.tagName as any)) {
                  const sectionURI = getURI(el.parentElement);
                  const id = el.getAttribute('id');
                  if (!id) {
                    throw new Error("Clause title seems to be missing ID");
                  }
                  const fmtTitleText = dom.documentElement.querySelector(`semx[element=title][source=${id}]`);
                  const fmtTitleRoot = fmtTitleText?.closest('fmt-title');
                  const clauseNumberEl = fmtTitleRoot?.querySelector('.fmt-caption-label');
                  const clauseNumber = clauseNumberEl?.textContent ?? '';
                  const graph: RelationGraphAsList = [];
                  if (clauseNumber.trim() !== '') {
                    graph.push([sectionURI, 'hasClauseNumber', clauseNumber]);
                  }

                  const parts = Array.from(fmtTitleText?.childNodes ?? []).
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
              'metanorma-extension': 'ignore',
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
