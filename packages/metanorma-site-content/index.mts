import {
  type Node as ProseMirrorNode,
  Fragment,
  NodeType as ProseMirrorNodeType,
} from 'prosemirror-model';

import {
  type ContentAdapterModule,
  type RelationGraphAsList,
  titleSchema,
  ROOT_SUBJECT,
  isURIString,
} from 'anafero/index.mjs';

import nodeViews from './nodeViews.jsx';

import { sha256 } from './sha.mjs';

import { coverBibdataSchema, clauseSchema } from './schema.mjs';

import {
  resolveChain,
  findValue,
  findAll,
  findPartsOfType,
  relativeGraph,
  hasSubject,
  getTextContent,
} from './graph-query-util.mjs';

import getDocumentTitle from './getDocumentTitle.mjs';

import type {
  Footnote,
  NodeProcessor,
  NodeProcessorState,
} from './pm-transform-util.mjs';

import { makeSplittingNodeProcessor } from './pm-transform-util.mjs';


type SubjectContentGenerator = 
  (
    subject: string,
    subjectNodeType: ProseMirrorNodeType | 'block' | 'inline',
    state: NodeProcessorState,
    /**
     * If provided, only include parts for which this returns true.
     * Recursively passed down.
     */
    partPredicate?: (partValue: string, partType?: string) => boolean,
  ) => ProseMirrorNode[]


function getCurrentLanguage(doc: Readonly<RelationGraphAsList>): string | undefined {
  const languages = resolveChain(doc, ['hasBibdata', 'hasLanguage', 'hasPart']);
  return languages.filter(([langID, ]) =>
    findValue(doc, langID, 'hasCurrent') === 'true'
  )[0]?.[1] ?? languages[0]?.[1] ?? undefined;
}

function getBibdataDocid(doc: Readonly<RelationGraphAsList>): string | undefined {
  const docids = resolveChain(doc, ['hasBibdata', 'hasDocidentifier', 'hasPart']);
  return docids.find(([uri, ]) =>
    findValue(doc, uri, 'hasPrimary') === 'true'
  )?.[1] ?? docids[0]?.[1];
}

function getEdition(
  bibdata: Readonly<RelationGraphAsList>,
  currentLanguage?: string,
): string | undefined {
  const editions = resolveChain(bibdata, ['hasEdition', 'hasPart']);
  /** Edition text, preferably in current language */
  const edition = (
    currentLanguage
      ? editions.find(([editionID, ]) =>
          findValue(bibdata, editionID, 'hasLanguage') === currentLanguage
        )?.[1]
      : undefined
  ) ?? editions[0]?.[1];

  return edition;
}

function getBibdataMainTitle(doc: Readonly<RelationGraphAsList>, lang?: string): string | undefined {
  const docids = resolveChain(doc, ['hasBibdata', 'hasTitle', 'hasPart']);
  return docids.find(([uri, ]) =>
    findValue(doc, uri, 'hasType') === 'title-main' &&
    (!lang || findValue(doc, uri, 'hasLanguage') === lang)
  )?.[1] ?? docids[0]?.[1];
}

function getSectionPlainTitle(section: Readonly<RelationGraphAsList>): string | undefined {

  //const clauseNumber = resolveChain(section, ['hasClauseNumber'], ROOT_SUBJECT)[0]?.[1];

  const parts = resolveChain(section, ['hasPart', 'type'], ROOT_SUBJECT);

  // Use plain `<title>`, it’s pre-processed by store adapter to prefer
  // fmt-title > semx[element=title], or full fmt-title, or title
  // in that order.
  const plainTitleIDs = parts.
    filter(([, type]) => type === 'title').
    map(([pID]) => pID);

  const plainTitleID = plainTitleIDs[0];

  const titleText = plainTitleID
    ? getTextContent(section, plainTitleID).join('')
    : '';

  return titleText ?? undefined;
}


const mod: ContentAdapterModule = {
  name: "Metanorma site content",
  version: "0.0.1",
  canGenerateContent: (uri: string) => {
    return uri.startsWith('urn:metanorma:doc-part:')
      || uri.startsWith('urn:metanorma:doc:')
      || uri.startsWith('urn:metanorma:collection:');
  },
  describe: (relations) => {
    // We may not know the language in some cases, like if it’s a section :(
    const primaryLanguageID = getCurrentLanguage(relations);

    const labelInPlainText = getBibdataMainTitle(relations, primaryLanguageID)?.trim()
      || getSectionPlainTitle(relations)?.trim()
      || getTextContent(relations, ROOT_SUBJECT).slice(0, 18).join('')
      // First few characters of the first few relations that are not a URI,
      // joined by a whitespace
      || relations.
           filter(([s, p, o]) =>
             s === ROOT_SUBJECT
             && p === 'hasPart'
             && o.trim() !== ''
             // TODO: Stop testing URI by urn: prefix
             && !o.startsWith('urn:') && !o.startsWith('data:')
           ).
           slice(0, 10).
           map(([s, p, o]) => o).
           join('').
           slice(0, 42).
           trim()
      // Type or generic “resource”
      || relations.find(([s, p, o]) => s === ROOT_SUBJECT && p === 'type')?.[2]
      || "unnamed";

    return (primaryLanguageID
      ? { labelInPlainText, primaryLanguageID }
      : { labelInPlainText });
  },
  contributingToHierarchy: [
    ['hasPart', 'hasClauseIdentifier'],
    ['hasPart', 'hasBibdata', 'hasDocidentifier', 'hasPart'],
  ],
  crossReferences: (rel) => {
    return rel.predicate === 'hasTarget' || rel.predicate === 'hasNext';
  },
  // This is not used currently
  contributesToContent: (relation, targetRelations) => {
    return relation.predicate === 'hasPart' || relation.predicate === 'hasText';
  },
  generateContent: function (relations, helpers) {
    //const bibdata = relations.find(([s, p,]) => s === '_:root' && p === 'hasBibdata');

    const rootType = relations.find(([s, p,]) => s === ROOT_SUBJECT && p === 'type')?.[2];
    if (!rootType) {
      console.warn("Won’t generate content for a resource that lacks a type");
      throw new Error();
    }

    const generator = generatorsByType[rootType];
    if (!generator) {
      console.warn("Cannot generate content: unrecognized type", rootType);
      return null;
    }

    if (relations.length > 0) {
      //console.debug("Want to generate content from relations", rootType, relations.join('\n'));
      //throw new Error();
    }

    return generator(relations, helpers);
  },
  resourceContentProseMirrorSchema: {
    cover: clauseSchema,
    clause: clauseSchema,
  },
  resourceContentProseMirrorOptions: {
    nodeViews,
  },
};

export default mod;


type ContentGenerator = ContentAdapterModule['generateContent'];
const generatorsByType: Record<string, ContentGenerator> = {

  collection: function generateCollection (graph) {
    const pm = coverBibdataSchema;

    const currentLanguage = getCurrentLanguage(graph);

    // Quick and dirty title
    const title = resolveChain(
      graph,
      ['hasBibdata', 'hasTitle', 'hasPart'],
      ROOT_SUBJECT,
    )[0]?.[1] || "A Metanorma collection";

    const bibdataID = graph.find(([s, p,]) => s === ROOT_SUBJECT && p === 'hasBibdata')?.[2];
    const bibdata = bibdataID ? relativeGraph(graph, bibdataID) : [];

    const docid = getBibdataDocid(graph);

    if (!title) {
      console.warn("Collection has no title", graph);
      //throw new Error("Collection has no title");
    }

    const meta: ProseMirrorNode[] = [];

    if (docid) {
      meta.push(
        pm.node('identifier', null, [pm.text(docid)]),
      );
    }
    const edition = bibdataID
      ? getEdition(bibdata, currentLanguage)
      : undefined;
    if (edition) {
      meta.push(
        pm.node('edition', null, [pm.text(edition)]),
      );
    }
    const dates = resolveChain(bibdata, ['hasDate', 'hasPart']);
    const pubDate = dates.find(([dateURI, ]) =>
      findValue(bibdata, dateURI, 'hasType') === 'published',
    )?.[1] || null;
    if (pubDate) {
      meta.push(
        pm.node('pubDate', null, [pm.text(pubDate)]),
      );
    }

    return {
      contentSchemaID: 'cover',
      primaryLanguageID: 'en', // TODO: No language in collection bibdata?
      labelInPlainText: title,
      title: titleSchema.node('doc', null, [
        titleSchema.text(title),
      ]).toJSON(),
      contentDoc: pm.node('doc', null, [
        pm.node('mainTitle', null, [pm.text(title)]),
        pm.node(
          'meta',
          null,
          meta.length > 0
            ? meta
            : [pm.node('identifier', null, pm.text("unidentified collection"))]
        ),
      ]).toJSON(),
    };
  },

  document: function generateDoc (doc, helpers) {
    return generateCoverPage(
      findAll(doc, ROOT_SUBJECT, 'hasAlternative'),
    )(doc, helpers);
  },

  section: function generateSection (section) {

    const pm = clauseSchema;
    const generateContent = makeSectionContentGenerator(section);

    // NOTE: This could be considered obsolete, because MN store adapter
    // now bypasses untitled clauses (inserting their content into
    // parent clauses).
    const moreSpecificSectionType = findAll(section, ROOT_SUBJECT, 'type').
    filter(t => t !== 'section' && t !== 'clause')[0];
    const labelInPlainText =
      getSectionPlainTitle(section) || (
        moreSpecificSectionType
          ? `untitled “${moreSpecificSectionType}” clause`
          : "untitled clause"
      );
    //if (!labelInPlainText) {
    //  throw new Error("Cannot generate clause: missing title");
    //}

    const processorState: NodeProcessorState = {
      annotations: {
        footnotes: {},
        currentFootnoteScope: null,
      },
    };

    const title =
      findPartsOfType(section, ROOT_SUBJECT, 'fmt-title')[0]
      ?? findPartsOfType(section, ROOT_SUBJECT, 'title')[0];
    const titleContent = title
      ? generateContent(title, pm.nodes.mainTitle!, processorState)
      : undefined;

    const clauseContents = getClauseContents(section, processorState);

    const contentDoc = pm.node(pm.topNodeType, null, [
      pm.node(
        'mainTitle',
        null,
        titleContent ?? [pm.text(labelInPlainText)],
      ),
      ...clauseContents,
    ]).toJSON();

    return {
      labelInPlainText,
      title: titleSchema.node(
        'doc',
        null,
        [titleSchema.text(labelInPlainText)],
      ).toJSON(),
      contentSchemaID: 'clause',
      contentDoc,
    };
  },

};


// This is problematic, because we cannot resolve related resources here.
// /** Returns the “parts” node or null if no suitable parts were found. */
// function makeTableOfClauses(
//   relations: Readonly<RelationGraphAsList>,
// ): ProseMirrorNode | null {
//   const subclauses = resolveChain(relations, ['hasPart']);
//   if (subclauses.length < 1) {
//     return null;
//   }
//   const pm = clauseSchema;
//   const partEntries = subclauses.map(([subj, clauseRef]) => {
//     const clauseTitle = findValue(relations, subj, 'hasLabel');
//     return pm.node('part_entry', null, [
//       pm.node('resource_link', { href: subj }, clauseTitle ? [
//         pm.text(clauseTitle),
//       ] : [pm.text(clauseRef)]),
//     ]);
//   });
//   if (partEntries.length > 0) {
//     return pm.node('parts', null, partEntries);
//   } else {
//     return null;
//   }
// }

const generateCoverPage:
(dlLinks: string[]) => ContentGenerator =
(dlLinks) => function (doc) {
  const bibdataID = doc.find(([s, p,]) => s === ROOT_SUBJECT && p === 'hasBibdata')?.[2];
  if (!bibdataID) {
    throw new Error("Can’t generate content: document is missing bibdata");
  }
  const docid = getBibdataDocid(doc);
  if (!docid) {
    throw new Error("Can’t generate content: bibdata is missing docid");
  }
  const currentLanguage = getCurrentLanguage(doc);
  //const languages = resolveChain(doc, ['hasLanguage', 'hasPart'], bibdataID);
  //const currentLanguage = languages.filter(([langID, ]) =>
  //  findValue(doc, langID, 'hasCurrent') === 'true'
  //)[0]?.[1];
  if (!currentLanguage) {
    throw new Error("Cannot generate document: missing current language");
  }
  const bibdata = relativeGraph(doc, bibdataID);
  const {
    hopefullyASuitableTitle,
  } = getDocumentTitle(currentLanguage, bibdata);

  if (!hopefullyASuitableTitle?.[0] || !hopefullyASuitableTitle?.[1]) {
    throw new Error("Cannot generate cover page: missing main title in current language");
  }
  
  const edition = getEdition(bibdata, currentLanguage);

  if (!edition) {
    throw new Error("Cannot generate cover page: missing edition");
  }

  //const revisionDate = resolveChain(bibdata, ['hasVersion', 'hasRevisionDate'])[0]?.[1];

  const dates = resolveChain(bibdata, ['hasDate', 'hasPart']);
  const pubDate = dates.find(([dateURI, ]) =>
    findValue(bibdata, dateURI, 'hasType') === 'published',
  )?.[1] || null;

  const contributors = resolveChain(bibdata, ['hasContributor']);
  const authorAndPublisherOrgURIs = contributors.
    filter(([, contribURI]) => {
      const roles = resolveChain(bibdata, ['hasRole', 'hasType'], contribURI);
      return roles.find(([, roleType]) => roleType === 'author' || roleType === 'publisher') !== undefined;
    }).
    map(([, contribURI]) => findValue(bibdata, contribURI, 'hasOrganization')).
    filter((orgURI) => orgURI !== null);
  const authorsAndPublishers = Array.from(new Set(authorAndPublisherOrgURIs.map(uri =>
    resolveChain(bibdata, ['hasName', 'hasPart'], uri)[0]?.[1]
  ).filter(name => name !== undefined)));
  const author = authorsAndPublishers[0] || null;

  const pm = clauseSchema;

  const metaContent = [
    pm.node('identifier', null, [pm.text(docid)]),
    pm.node('edition', null, [pm.text(edition)]),
  ];

  if (pubDate) {
    metaContent.push(
      pm.node('pubDate', null, [pm.text(pubDate)])
    );
  }
  if (author) {
    metaContent.push(
      pm.node('contributor', null, [pm.text(author)])
    );
  }

  // Generates cover page content
  const generateContent = makeSectionContentGenerator(doc);

  const processorState: NodeProcessorState = {
    annotations: {
      footnotes: {},
      currentFootnoteScope: null,
    },
  };

  return {
    contentSchemaID: 'cover',
    primaryLanguageID: currentLanguage,
    labelInPlainText: hopefullyASuitableTitle[1],
    title: titleSchema.node('doc', null, [
      titleSchema.text(hopefullyASuitableTitle[1]),
    ]).toJSON(),
    contentDoc: pm.node('doc', null, [
      pm.node('mainTitle', null, [pm.text(hopefullyASuitableTitle[1])]),

      // The rest of document titles, excluding the main one
      // Probably unnecessary?
      // ...titlesInOtherLanguages.
      //   map(([, titleText]) =>
      //     pm.node('someOtherTitle', null, [pm.text(titleText)]),
      //   ),

      pm.node('meta', null, [
        ...metaContent,
        ...dlLinks.filter(href => href.trim() !== '').map(href =>
          pm.node(
            'meta_link',
            {
              href,
              download:
                `${docid}${href.slice(href.lastIndexOf('.'))}`,
            },
            pm.text(href.slice(href.lastIndexOf('.'))),
          )
        ),
      ]),

      ...generateContent(ROOT_SUBJECT, pm.nodes.doc!, processorState),
    ]).toJSON(),
  };
};


// TODO: Split out clause content generator into a module?


function getClauseContents(
  section: Readonly<RelationGraphAsList>,
  processorState: NodeProcessorState,
): ProseMirrorNode[] {

    const pm = clauseSchema;
    const generateContent = makeSectionContentGenerator(section);

    // // FIXME: Too hacky and global-y
    // let currentFootnoteScope: null | string = null;
    // function footnoteScope(subj?: string | undefined | null) {
    //   if (subj !== undefined) {
    //     currentFootnoteScope = subj;
    //   } else {
    //     return currentFootnoteScope;
    //   }
    //   return;
    // }

    type FootnoteNode = ProseMirrorNode & { type: 'footnote' };
    //// Footnote nodes mapped to resource IDs
    //const footnotes: Record<string, FootnoteNode> = {};
    function makeFootnote(resourceID: string, footnote: Footnote): ProseMirrorNode {
      return pm.node(
        'footnote',
        { resourceID, cue: footnote.cue },
        footnote.content,
      ) as FootnoteNode;
    }

    const docContents = generateContent(
      ROOT_SUBJECT,
      pm.nodes.doc!,
      processorState,
    );

    if (Object.keys(processorState.annotations.footnotes).length > 0) {
      docContents.push(pm.node(
        'footnotes',
        null,
        Object.entries(processorState.annotations.footnotes).
        map(([id, fn]) => makeFootnote(id, fn)),
      ));
    }

    //const clauses = makeTableOfClauses(section);
    //if (clauses) {
    //  docContents.push(clauses);
    //}

    return docContents;
}

function makeSectionContentGenerator(
  section: Readonly<RelationGraphAsList>,
): SubjectContentGenerator {
  const pm = clauseSchema;

  const simpleNodes: Record<string, string> = {
    //'unorderedList': 'bullet_list',
    //'orderedList': 'ordered_list',
    //'paragraph': 'paragraph',
    //'sourcecode': 'source_listing',
    'span': 'span',

    // TODO: Figure out what to do with underlines. <u> isn’t fit
    'underline': 'underline',
    'strong': 'strong',
    'em': 'em',
    'sup': 'sup',
    'bookmark': 'anchor',

    //'dl': 'definition_list',
    'dd': 'dd',
    'dt': 'dt',
    'br': 'linebreak',
    'tt': 'code',
    //'semx': 'span',
    //'tableCell': 'table_cell',
  };

  const blockNodesNestedInParagraphs = [
    'note',
    'orderedList',
    'unorderedList',
  ];

  function getProcessorForInvalidListPart(partType: string):
  NodeProcessor | undefined {
    if (partType === 'note') {
      return customNodes.note;
    }
    return undefined;
  }

  const processValidListPart: NodeProcessor =
  function processValidListPart(subj, state) {
    const type = findValue(section, subj, 'type');
    if (type) {
      const maybeNodes = makeNodeOrNot(subj, type, state);
      const maybeNode = (Array.isArray(maybeNodes))
        ? maybeNodes[0]
        : maybeNodes;
      if (maybeNode) {
        if (type !== 'listItem') {
          const content = type === 'paragraph'
            ? [maybeNode]
            : [
                pm.node('paragraph', null, [pm.text(' ')]),
                maybeNode,
              ];
          return pm.node('list_item', null, content);
        } else {
          return maybeNode;
        }
      }
    }
    return undefined;
  }

  /**
   * Maps resource’s `type` predicate value to PM node constructor.
   * PM node constructor can return a PM node, or a list of PM nodes,
   * or undefined. Constroctor can invoke onAnnotation callback
   * if a block is encountered that should be placed elsewhere
   * and referenced from the contents, providing the callback
   * with annotation type (e.g., footnote), nodes, and a unique reference.
   */
  const customNodes: Record<string, NodeProcessor> = {
    'unorderedList': makeSplittingNodeProcessor(
      section,
      getProcessorForInvalidListPart,
      function makeBulletListNode(resourceID, parts) {
        return pm.node('bullet_list', { resourceID }, parts);
      },
      processValidListPart,
    ),
    'orderedList': makeSplittingNodeProcessor(
      section,
      getProcessorForInvalidListPart,
      function makeOrderedListNode(resourceID, parts) {
        return pm.node('ordered_list', { resourceID }, parts);
      },
      processValidListPart,
    ),
    'paragraph': makeSplittingNodeProcessor(
      section,
      function getProcessorForInvalidParagraphPart(partType) {
        if (blockNodesNestedInParagraphs.includes(partType)) {
          return customNodes[partType];
        }
        return undefined;
      },
      function makeParagraphNode(resourceID, parts) {
        return pm.node('paragraph', { resourceID }, parts);
      },
      function processParagraphPart(subj, state) {
        if (hasSubject(section, subj)) {
          // This part is a nested element
          const partType = findValue(section, subj, 'type');
          if (partType) {
            return makeNodeOrNot(subj, partType, state);
          }
        } else if (subj) {
          // This part is a text node
          return pm.text(subj);
        }
        return undefined;
      },
    ),
    'dl': function (subj, state): (ProseMirrorNode | undefined)[] {
      const nodeID = 'definition_list';
      const nodeType = pm.nodes[nodeID]!;
      const maybeNoteSubject = findPartsOfType(section, subj, 'note')[0];
      const content = generateContent(
        subj,
        nodeType,
        state,
        maybeNoteSubject
          ? ((part) => part !== maybeNoteSubject)
          : undefined);
      return [
        pm.node(
          nodeID,
          { resourceID: subj },
          content,
        ),
        ...(maybeNoteSubject
          ? [this['note']!(maybeNoteSubject, state)].flat()
          : []),
      ];
    },
    'quote': (subj, state) => {
      return pm.node(
        'blockquote',
        { resourceID: subj },
        generateContent(subj, pm.nodes.blockquote!, state),
      );
    },
    'fmt-link': (subj: string, state) => {
      const target = findValue(section, subj, 'hasTarget');
      if (!target) {
        console.warn("Cannot create a link without target/href");
        return undefined;
      }
      if (target.startsWith('http') || target.startsWith('mailto:')) {
        return pm.node('external_link', { href: target }, generateContent(subj, pm.nodes.external_link!, state));
      } else {
        console.warn("Unexpected link target!", target);
        return undefined;
      }
    },
    'stem': (subj: string) => {
      const mathML = findValue(section, subj, 'hasMathML');
      return pm.node('math', { mathML });
    },
    'formula': (subj: string, state) => {
      const mathSubj = findPartsOfType(section, subj, 'stem')[0];
      if (!mathSubj) {
        return undefined;
      }
      const mathML = findValue(section, mathSubj, 'hasMathML');
      const caption = findPartsOfType(section, subj, 'fmt-name')[0];
      const figureContents = [
        pm.node('paragraph', null, [pm.node('math', { mathML })]),
      ];
      if (caption) {
        figureContents.push(
          pm.node(
            'figCaption',
            { resourceID: caption },
            generateContent(caption, pm.nodes.figCaption!, state),
          ),
        );
      }
      return pm.node('figure', { resourceID: subj }, figureContents);
    },
    'sourcecode': (subj: string, state) => {
      const formattedSource = findValue(section, subj, 'hasFormattedSource');
      if (!formattedSource) {
        console.error("Sourcecode lacks formatted source");
        return undefined;
      }
      const content = [pm.node('source_listing', { formattedSource })];
      const captionID = findPartsOfType(section, subj, 'fmt-name')[0];
      if (captionID) {
        content.push(pm.node(
          'figCaption',
          { resourceID: captionID },
          generateContent(captionID, pm.nodes.figCaption!, state),
        ));
      }
      return pm.node(
        'figure',
        { resourceID: subj },
        content,
      );
    },

    'fmt-source': (subj, state) => {
      const content = generateContent(subj, pm.nodes.paragraph!, state);
      // Render fmt-source as an admonition :shrug:
      return pm.node('paragraph', { resourceID: subj }, content);
    },

    'fmt-xref': (subj: string, state) => {
      const target = findValue(section, subj, 'hasTarget');
      if (!target) {
        console.warn("Cannot create a resource link without target/href");
        return undefined;
      }
      return pm.node(
        'resource_link',
        { href: target },
        generateContent(subj, pm.nodes.resource_link!, state),
      );
    },

    'subclause-separator': (subj) => {
      return pm.node(
        'subheader',
        { resourceID: subj },
        pm.text('***'),
      );
    },

    'section': (subj, state) => {
      // TODO: Normalize title processing

      // We don’t have an entry for fmt-title, because we process it
      // separately, but we want to process it when in subsection:
      const title = findPartsOfType(section, subj, 'fmt-title')[0];
      const content = generateContent(subj, pm.nodes.section!, state);
      if (title) {
        content.splice(0, 0, pm.node(
          'subheader',
          { resourceID: title },
          generateContent(title, pm.nodes.subheader!, state),
        ));
      }
      return pm.node(
        'section',
        { resourceID: subj },
        content,
      );
    },

    // 'xref': function (subj: string, onAnnotation) {
    //   return this['fmt-xref']!(subj, onAnnotation);
    // },

    'term': function (subj, state) {
      const fmtName = findPartsOfType(section, subj, 'fmt-name')[0];

      // In case of some documents, this contains
      // both designations AND definitions:
      const definition = findPartsOfType(section, subj, 'fmt-definition')[0];

      // In case of other documents, fmt-definition does not contain
      // designations, but fmt-preferred should:
      const preferred = findPartsOfType(section, subj, 'fmt-preferred')[0];

      // (If a document has neither fmt-preferred nor a designation inside
      // fmt-definition, we can’t really know since we bypass any semx
      // containers and don’t have access to them at this stage.)

      if (!definition) {
        console.warn(
          "Cannot represent a term without a definition",
          subj);
        return undefined;
      }

      const preferredContents = preferred
        ? findPartsOfType(section, preferred, 'paragraph')[0]
        : undefined;

      const definitionContent =
        generateContent(definition, pm.nodes.definition!, state);

      const notes = findPartsOfType(section, subj, 'termnote');
      definitionContent.push(
        ...notes.
        flatMap(subj => this['note']!(subj, state)).
        filter(n => n !== undefined)
      );

      const content: ProseMirrorNode[] = [];

      if (preferredContents) {
        content.push(
          pm.node(
            'term',
            { preferred: true },
            generateContent(preferredContents, pm.nodes.term!, state)
          ),
        );
      }

      content.push(
        pm.node('definition', null, definitionContent),
      );

      if (fmtName) {
        content.splice(0, 0, pm.node(
          'termLabel',
          null,
          generateContent(fmtName, pm.nodes.termLabel!, state)),
        );
      }

      const sources = findPartsOfType(section, subj, 'fmt-termsource');
      content.push(...sources.map(subj =>
        pm.node(
          'termSource',
          null,
          generateContent(subj, pm.nodes.termSource!, state),
        )
      ));

      return pm.node(
        'termWithDefinition',
        { resourceID: subj },
        content,
      );
    },
    'example': (subj, state) => {
      //const caption = findValue(section, subj, 'hasFmtName');
      const captionParts = findPartsOfType(section, subj, 'fmt-name');

      // TODO: Refactor this, probably with generateContent, see admonition/note
      const contents: ProseMirrorNode[] = [];
      for (const part of findAll(section, subj, 'hasPart')) {
        const type = findValue(section, part, 'type');
        if (type) {
          const node = makeNodeOrNot(part, type, state);
          const nodes = Array.isArray(node) ? node : [node];
          for (const node of nodes.filter(n => n !== undefined)) {
            contents.push(node);
          }
        }
      }
      if (captionParts.length > 0) {
        contents.splice(0, 0, pm.node(
          'figCaption',
          null,
          captionParts.
            flatMap(part => generateContent(part, pm.nodes.figCaption!, state)),
        ));
      }
      // We will wrap the example in a figure.
      return pm.node('example', { resourceID: subj }, contents);
    },
    'note': (subj, state) => {
      const tags = ['note'];
      const type = findValue(section, subj, 'hasType') ?? '';
      if (type) {
        tags.push(type);
      }

      // Body of the admonition is everything except fmt-xref-label and fmt-name
      const contents: ProseMirrorNode[] = findAll(section, subj, 'hasPart').
        map(part => [part, findValue(section, part, 'type')]).
        filter(([, partType]) => {
          return partType && ['fmt-xref-label', 'fmt-name'].indexOf(partType) < 0;
        }).
        flatMap(([part, partType]) => makeNodeOrNot(part!, partType!, state)).
        filter(n => n !== undefined);

      // Only take the first xref label
      // (which will be admonition type, i.e. “note”)
      const xrefLabels = findPartsOfType(section, subj, 'fmt-xref-label').slice(0, 1);
      xrefLabels.reverse();
      for (const xrefLabel of xrefLabels) {
        contents.splice(0, 0, pm.node(
          'xrefLabel',
          null,
          generateContent(xrefLabel, pm.nodes.xrefLabel!, state),
        ));
      }

      return pm.node('admonition', { resourceID: subj, tags }, contents);
    },
    'tab': () => pm.text('	'),
    'footnote': (subj, state) => {
      const cue = findValue(section, subj, 'hasReference');
      if (!cue) {
        console.error("Cannot create a footnote without reference");
        return undefined;
      }
      //const aUUID = crypto.randomUUID();
      //const resourceID = `urn:x-metanorma-footnote:${aUUID}`

      // In MN XML, footnotes have no IDs. We assign them an ID here
      // based on the cue. It’s not great, since this ID isn’t reflected
      // in the graph
      const footnoteContent = generateContent(subj, 'block', state);
      const hash = sha256();
      footnoteContent.map(node => hash.add(node.textContent.toString()));
      const scope = state.annotations.currentFootnoteScope;
      // Append a closing parenthesis to turn Metanorma-given “a” into “a)”
      const formattedCue = `${cue})`;
      const scopedCue = scope
        ? `${scope}: ${formattedCue}`
        : formattedCue;
      const madeUpDOMID = `${encodeURIComponent(scopedCue)}-${hash.digest().hex()}`;

      if (!state.annotations.footnotes[madeUpDOMID]) {
        state.annotations.footnotes[madeUpDOMID] = {
          cue: scopedCue,
          content: footnoteContent,
          referenceCount: 1,
        };
      } else {
        state.annotations.footnotes[madeUpDOMID]!.referenceCount += 1;
      }

      const refCount = state.annotations.footnotes[madeUpDOMID]!.referenceCount;

      return pm.node(
        'footnote_cue',
        { resourceID: `${madeUpDOMID}-${refCount}` },
        [
          // This is wrong, but works around current MN XML footnote behavior
          // It will cause warnings during generation, because any href
          // is supposed to be either an external link or point to a resource
          pm.node(
            'resource_link',
            { href: `#${madeUpDOMID}` },
            [pm.text(formattedCue)],
          ),
        ],
      );
    },
    'table': function (subj, state) {
      const caption = findValue(section, subj, 'hasFmtName');
      //const caption = name ? findValue(section, name, 'hasPart') : null;

      const xrefLabel = findValue(section, subj, 'hasFmtXrefLabel');
      const xrefLabelContent = xrefLabel
        ? generateContent(xrefLabel, pm.nodes.xrefLabel!, state)
        : null;
      const newFootnoteScope = xrefLabelContent
        ? xrefLabelContent.map(n => n.textContent).join('')
        : null;

      if (!newFootnoteScope) {
        console.warn("No footnote scope for table", subj, xrefLabel);
      }

      const thead = findValue(section, subj, 'hasTableHeader');
      let rows: string[] = [];
      if (thead) {
        rows.push(...findAll(section, thead, 'hasTableRow'));
      }

      const tbody = findValue(section, subj, 'hasTableBody');
      if (!tbody) {
        console.warn("Tables without tbody are not expected");
        rows.push(...findAll(section, subj, 'hasTableRow'));
      } else {
        rows.push(...findAll(section, tbody, 'hasTableRow'));
      }

      const tfoot = findValue(section, subj, 'hasTableFooter');
      if (tfoot) {
        rows.push(...findAll(section, tfoot, 'hasTableRow'));
      }

      const tableContents: ProseMirrorNode[] = [];

      let colWidths: string[] = [];
      const colgroup = findValue(section, subj, 'hasColgroup');
      if (colgroup) {
        const maybeColWidths = findAll(section, colgroup, 'hasCol').
          map(colID =>
            findValue(section, colID, 'hasWidth')
          ).filter(v => v !== undefined && v !== null);
        if (maybeColWidths.length > 0) {
          colWidths = maybeColWidths;
        }
      }

      if (newFootnoteScope) {
        state.annotations.currentFootnoteScope = newFootnoteScope;
      }
      tableContents.push(...rows.map(rowID =>
        pm.node(
          'table_row',
          null,
          findAll(
            section,
            rowID,
            ['hasTableCell', 'hasTableHeaderCell']).
          map(cellID =>
            pm.node(
              findValue(section, cellID, 'type') === 'tableHeaderCell'
                ? 'table_header'
                : 'table_cell',
              {
                colspan: findValue(section, cellID, 'hasColspan'),
                rowspan: findValue(section, cellID, 'hasRowspan'),
                resourceID: cellID,
              },
              generateContent(cellID, pm.nodes.table_cell!, state),
            )
          ),
        )
      ));
      if (newFootnoteScope) {
        state.annotations.currentFootnoteScope = null;
      }

      if (tableContents.length < 1) {
        return undefined;
      }

      //console.debug(tableContents);
      const contents = [
        pm.node(
          'table',
          colWidths ? { colWidths } : null,
          tableContents,
        ),
      ];
      if (caption) {
        contents.splice(0, 0, pm.node(
          'figCaption',
          { resourceID: caption },
          generateContent(caption, pm.nodes.figCaption!, state),
        ));
      }

      // TODO: Direct paragraph descendants not allowed by the spec?
      const paragraphs = findAll(section, subj, 'hasParagraph');
      if (paragraphs.length > 0) {
        // NOTE: If there are nodes not allowed by table node spec intermingled
        // then it will fail to create the table.
        contents.push(
          ...paragraphs.
          flatMap(subj => this['paragraph']!(subj, state)).
          filter(n => n !== undefined)
        );
      }
      // TODO: Direct source descendants not allowed by the spec?
      const sources = findAll(section, subj, 'hasSource');
      if (sources.length > 0) {
        contents.push(
          ...sources.
          flatMap(subj => this['paragraph']!(subj, state)).
          filter(n => n !== undefined)
        );
      }

      const notes = findAll(section, subj, 'hasNote');
      if (notes.length > 0) {
        contents.push(
          ...notes.
          flatMap(subj => this['note']!(subj, state)).
          filter(n => n !== undefined)
        );
      }

      // We will wrap the table in a figure, because PM’s default tables
      // don’t have captions or resourceID.
      // TODO: implement fully custom tables for parity with MN?
      return pm.node('tableFigure', { resourceID: subj }, contents);
    },
    'bibitem': (subj: string, onAnnotation) => {
      const contents: ProseMirrorNode[] = [];
      const tagSubj = findValue(section, subj, 'hasBiblioTag');
      if (tagSubj) {
        contents.push(pm.node(
          'span',
          null,
          generateContent(tagSubj, pm.nodes.span!, onAnnotation),
        ));
      }
      const formattedref = findValue(section, subj, 'hasFormattedref');
      if (formattedref) {
        contents.push(
          ...generateContent(formattedref, pm.nodes.span!, onAnnotation)
        );
      }
      const uris = findAll(section, subj, 'hasUri');
      contents.push(
        ...uris.map(uri =>
          [findValue(section, uri, 'hasPart'), findValue(section, uri, 'hasType')]
        ).
        filter(([href, ]) => href !== '' && href !== undefined).
        flatMap(([href, type]) => [
          pm.text(' '),
          pm.node(
            'external_link',
            { href },
            pm.text(`[${type ?? 'link'}]`),
          ),
        ])
      );
      return pm.node('bibitem', { resourceID: subj }, contents);
    },
    'listItem': (subj: string, onAnnotation) => {
      const firstPart = findValue(section, subj, 'hasPart');
      if (!firstPart) {
        return undefined;
      }
      //const firstPartTypes = findAll(section, firstPart, 'type');
      const content = generateContent(subj, pm.nodes.list_item!, onAnnotation);
      //console.debug("processing list item", subj, JSON.stringify(pm.node('list_item', null, content).toJSON()), null, 2);
      if (content[0]?.type?.name !== 'paragraph') {
        console.warn("Inserting leading paragraph to ensure a valid list item");
        if (hasSubject(section, firstPart)) {
          // First part is an element, so insert an empty paragraph
          // before it.
          content.splice(0, 0, pm.node('paragraph', null, [pm.text(" ")]));
        } else {
          // First part is plain text, so insert a paragraph
          // containing this text.
          content.splice(0, 1, pm.node('paragraph', null, [pm.text(firstPart)]));
        }
      }
      //console.debug("processing list item: after", subj, JSON.stringify(pm.node('list_item', null, content).toJSON()), null, 2);
      return pm.node('list_item', null, content);
    },
    'figure': (subj: string, onAnnotation) => {
      const image = findValue(section, subj, 'hasImage');
      const imgSrc = image
        ? findValue(section, image, 'hasSrc')
        : undefined;
      const svg = image
        ? findValue(section, image, 'hasSvg')
        : undefined;
      const width = image
        ? findValue(section, image, 'hasWidth')
        : undefined;
      const height = image
        ? findValue(section, image, 'hasHeight')
        : undefined;
      const svgContents = svg
        ? findValue(section, svg, 'hasSVGContents')
        : undefined;
      const arbitraryLiteralBlock = findValue(section, subj, 'hasPre');
      if (!imgSrc && !svgContents && !arbitraryLiteralBlock) {
        console.warn("Won’t create a figure without an image src or SVG contents", subj);
        return undefined;
      }
      let figureContents: ProseMirrorNode[] = [];
      if (svgContents) {
        figureContents.push(
          pm.node('image', { src: `data:image/svg+xml,${encodeURIComponent(svgContents)}` }),
        );
      } else if (imgSrc) {
        figureContents.push(
          pm.node('image', { src: imgSrc, width, height }),
        );
      } else if (arbitraryLiteralBlock) {
        const parts = generateContent(
          arbitraryLiteralBlock,
          pm.nodes.arbitrary_literal_block!,
          onAnnotation,
        );
        figureContents.push(
          pm.node('arbitrary_literal_block', null, parts),
        );
      }
      const caption = findValue(section, subj, 'hasFmtName');
      if (caption) {
        figureContents.push(
          pm.node(
            'figCaption',
            { resourceID: caption },
            generateContent(
              caption,
              pm.nodes.figCaption!,
              onAnnotation,
            ),
          ),
        );
      }
      return pm.node('figure', { resourceID: subj }, figureContents);
    },
  };

  function makeNodeOrNot(
    subj: string,
    subjType: string,
    state: NodeProcessorState,
    /**
     * If provided, only include parts for which this returns true.
     * Recursively passed down.
     */
    partPredicate?: (partValue: string, partType?: string) => boolean,
  ):
  ProseMirrorNode | undefined | (ProseMirrorNode | undefined)[] {
    //console.debug(subj, subjType);
    if (simpleNodes[subjType]) {
      const nodeID = simpleNodes[subjType];
      const nodeType = pm.nodes[nodeID];
      if (!nodeType) {
        console.error("No node defined in schema", nodeID);
        return undefined;
      }
      const content = generateContent(subj, nodeType, state, partPredicate);
      return pm.node(
        nodeID,
        { resourceID: subj },
        content,
      );
      //if (content.length > 0) {
      //  return pm.node(
      //    nodeID,
      //    { resourceID: subj },
      //    content,
      //  );
      //} else {
      //  console.warn("Empty content generated", subj, subjType);
      //  return undefined;
      //}
    } else if (customNodes[subjType]) {
      return customNodes[subjType](subj, state);
    } else {
      return undefined;
    }
  }
  const generateContent: SubjectContentGenerator =
  function generateContent(
    subject,
    subjectNodeType,
    state,
    partPredicate,
  ) {
    const allSubparts: ProseMirrorNode[] =
    // TODO: subject is really only used to resolve relations,
    // maybe this can be refactored out of this function.
    resolveChain(section, ['hasPart'], subject).
    flatMap(([, partValue]) => {
      // TODO: Don’t rely on urn: prefix when determining subjectness
      if (!isURIString(partValue)) {
        // Part itself is not a subject, so treat as text.

        if (partPredicate && !partPredicate(partValue)) {
          return [undefined];
        }

        if (
          (
            // If this is an inline content node, accept any part
            // (even if it contains just e.g. spaces or newlines)
            // unless it is literally an empty string
            partValue !== '' && (
              subjectNodeType === 'inline' || (
                typeof subjectNodeType !== 'string'
                &&
                subjectNodeType.inlineContent
              )
            )
          )
          ||
          // If this is not an inline content node, accept any part
          // unless it is an empty string when trimmed
          partValue.trim() !== ''
        ) {
          return [pm.text(partValue)];
          //if (subjectNodeType.inlineContent) {
          //  return pm.text(`${partValue} `);
          //} else {
          //  return pm.node('paragraph', null, [pm.text(partValue)]);
          //}
          //if (canCreate(textNode, subjectNodeType)) {
          //  return textNode;
          //} else {
          //  console.warn("Cannot create a text node under", subject, "will try wrapping in paragraph");
          //  const paragraphNode = pm.node('paragraph', null, pm.text(partValue));
          //  if (canCreate(paragraphNode, subjectNodeType)) {
          //    return paragraphNode;
          //  } else {
          //    console.error("Cannot create a paragraph node under", subject, "will skip");
          //    return undefined;
          //  }
          //}
        } else {
          return [undefined];
        }
      } else {
        const types = findAll(section, partValue, 'type');
        // Test against every type relation of this subject,
        // and take the first for which we can create a node.
        for (const type of types) {
          if (partPredicate && !partPredicate(partValue, type)) {
            continue;
          }
          const maybeNode = makeNodeOrNot(partValue, type, state, partPredicate);
          if (maybeNode) {
            //if (canCreate(maybeNode, subjectNodeType)) {
            if (Array.isArray(maybeNode)) {
              return maybeNode;
            } else {
              return [maybeNode];
            }
            //} else {
            //  console.warn("Cannot create node under", subject, subjectNodeType.name, type, maybeNode);
            //}
          }
        }
        return [undefined];
      }
    }).
    filter(maybeNode => maybeNode !== undefined);

    // TODO: Refactor to only allow string subjectNodeType?
    const subjectNodeTypeRepr = typeof subjectNodeType === 'string'
      ? subjectNodeType
      : subjectNodeType.name;
    if (typeof subjectNodeType !== 'string') {
      if (subjectNodeType.validContent(Fragment.from(allSubparts))) {
        return allSubparts;
      } else {
        if (subjectNodeType.inlineContent && allSubparts.find(node => !node.isInline)) {
          console.warn("Trying to create a block in an inline-content node", subjectNodeTypeRepr, allSubparts.map(n => n.textContent).join(', '));
          return allSubparts.
          map(n => n.isInline
            ? n
            //: (new Transform(n).doc.textContent.toString() ?? ''))
            : pm.text(n.textContent || '[no content]'))
        } else if (!subjectNodeType.inlineContent && allSubparts.find(node => node.isInline)) {
          //return allSubparts;
          if (allSubparts.find(node => !node.isInline)) {
            console.warn("Mixing inline nodes in a block-content node for resource:", subject, subjectNodeTypeRepr/*, allSubparts.filter(node => !node.isInline).map(n => n.toString())*/);
            return allSubparts.map(n =>
              n.isInline
                ? pm.node('paragraph', null, [n])
                : n)
          } else {
            //console.error("Only inline content in a block-content node: wrapping in a paragraph", subject, subjectNodeTypeRepr);
            return [pm.node('paragraph', { resourceID: subject }, allSubparts)];
          }
        } else {
          return allSubparts;
          //console.error("Something went wrong", subject, subjectNodeType.name);
        }
      }
    } else {
      if (subjectNodeType === 'inline' && allSubparts.find(n => !n.isInline)) {
        console.warn("Trying to create a block in an inline-content node? Will unwrap text content.", subjectNodeTypeRepr, allSubparts.map(n => n.textContent).join(', '));
        return allSubparts.
        map(n => n.isInline
          ? n
          //: (new Transform(n).doc.textContent.toString() ?? ''))
          : pm.text(n.textContent || '[no content]'))
      } else if (subjectNodeType === 'block' && allSubparts.find(n => n.isInline)) {
        if (allSubparts.find(node => !node.isInline)) {
          console.error("Trying to create an inline node in a block-content node? Will wrap in a paragraph.", subjectNodeTypeRepr, allSubparts.filter(node => !node.isInline).map(n => n.toString()));
          return allSubparts.map(n =>
            n.isInline
              ? pm.node('paragraph', null, [n])
              : n)
        } else {
          return [pm.node('paragraph', null, allSubparts)];
        }
      } else {
        return allSubparts;
      }
    }
    console.error(
      "Something went wrong, and nothing was generated",
      subject,
      subjectNodeType);
    return [];
  }

  return generateContent;
}
