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
  if (!id) { return ''; }
  //return unescape(id.replaceAll('___x', '%u').replaceAll('__x', '%u'));
  const subbed = id.replace(/_?__x([0-9a-fA-F]{2})_?/g, '%$1');
  return unescape(subbed);
}

const processClauseLike: CustomElementProcessor =
function processClauseLike(el: Element) {
  if (el.getAttribute('hidden')) {
    return [[], false];
  } else {
    return [
      [[
        ROOT_SUBJECT,
        'hasClauseIdentifier',
        (
          el.getAttribute('anchor') ||
          mangleXMLIdentifier(el.getAttribute('id') ?? '')
        ) || `unidentified-${el.tagName}-${crypto.randomUUID()}`,
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

const AUTO_GENERATED_URI_PREFIX = `urn:metanorma:doc-part-unstable`;

function getResourceURI(el: Element): string {
  let maybeID: string | null;
  if (el.tagName === 'metanorma' && el.ownerDocument.documentElement.tagName === 'metanorma-collection') {
    if (el.parentElement?.tagName === 'doc-container') {
      // doc-container is bypassed, but we can grab its ID.
      maybeID = el.parentElement.getAttribute('id');
    } else {
      // This probably technically shouldn’t happen.
      // If the root tag is <metanorma-collection>,
      // then we only expect <metanorma> inside <doc-container>s.
      maybeID = el.getAttribute('id');
    }
  } else if (el.tagName === 'clause') {
    maybeID =
      el.getAttribute('anchor')
      || mangleXMLIdentifier(el.getAttribute('id') ?? '');
  } else {
    maybeID = el.getAttribute('id');
  }
  return maybeID
    // We have a proper (hopefully stable) ID
    ? urnFromID(maybeID)
    // We need to make up an ID
    : `${AUTO_GENERATED_URI_PREFIX}:${el.tagName}-${crypto.randomUUID()}`;
}

const mod: StoreAdapterModule = {
  name: 'Metanorma XML store adapter',
  version: '0.0.1',
  canResolve: (path) => path.endsWith('.xml'),
  readerFromBlob: async function (blob, helpers) {
    const dom = helpers.decodeXML(blob);

    const isValidDocumentEntryPoint =
      dom.documentElement.tagName === 'metanorma'
      && dom.documentElement.getAttribute('type') === 'presentation'
      && dom.querySelector('metanorma > bibdata > docidentifier[primary="true"]')?.textContent

    const isValidCollectionEntryPoint =
      dom.documentElement.tagName === 'metanorma-collection'
      //&& dom.documentElement.getAttribute('type') === 'presentation'
      && dom.querySelector('metanorma-collection > bibdata > docidentifier')?.textContent

    if (!(isValidDocumentEntryPoint || isValidCollectionEntryPoint)) {
      throw new Error("Invalid Metanorma document or collection presentation XML");
    }

    return [
      [],
      {
        getCanonicalRootURI: () => {
          const primaryDocid =
            dom.querySelector('metanorma > bibdata > docidentifier[primary="true"]')?.textContent
            ?? undefined;
          const collectionID =
            dom.querySelector('metanorma-collection > bibdata > docidentifier[primary="true"]')?.textContent
            ?? dom.querySelector('metanorma-collection > bibdata > docidentifier')?.textContent
            ?? undefined;
          return primaryDocid
            ? `urn:metanorma:doc:${encodeURIComponent(primaryDocid)}`
            : collectionID
              ? `urn:metanorma:collection:${encodeURIComponent(collectionID)}`
              : undefined;
        },
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
              'metanorma-collection': function processMetanormaCollectionRoot() {
                return [
                  [[ROOT_SUBJECT, 'type', 'collection']],
                  {
                    getChildPredicate: (_, childEl) =>
                      childEl.tagName === 'metanorma'
                        ? 'hasPart'
                        : tagNameToHasPredicate(childEl.tagName),
                  },
                ] as [RelationGraphAsList, Rules];
              },
              'doc-container': 'bypass',
              metanorma: function processMetanormaRoot() {
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
              eref: 'ignore',
              origin: 'ignore',
              source: 'bypass',
              quote: processAsGenericContainer,
              title: function processTitle(el, getURI) {
                if (el.parentElement
                    && sectionLikeElements.includes(el.parentElement.tagName as any)) {
                  const sectionURI = getURI(el.parentElement);
                  const id = el.getAttribute('id');
                  //if (!id) {
                  //  throw new Error("Clause title seems to be missing ID");
                  //}
                  const fmtTitleText = id
                    ? dom.documentElement.querySelector(`semx[element=title][source=${id}]`)
                    : null;
                  const fmtTitleRoot = fmtTitleText?.closest('fmt-title');
                  const clauseNumberEl = fmtTitleRoot?.querySelector('.fmt-caption-label');
                  const clauseNumber = clauseNumberEl?.textContent ?? '';
                  const graph: RelationGraphAsList = [];
                  if (clauseNumber.trim() !== '') {
                    graph.push([sectionURI, 'hasClauseNumber', clauseNumber]);
                  }

                  const parts = Array.from((fmtTitleText ?? el)?.childNodes ?? []).
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

              'boilerplate': 'bypass',
              'copyright-statement': 'bypass',
              'legal-statement': 'bypass',
              'feedback-statement': 'bypass',

              'metanorma-extension': 'ignore',
              'localized-strings': 'ignore',
              'presentation-metadata': 'ignore',
            },
          }, opts);
        },
      },
    ];
  },
} as const;

export default mod;
