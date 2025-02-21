import { Schema, type Node as ProseMirrorNode, Fragment, NodeType as ProseMirrorNodeType } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';
import { addListNodes } from 'prosemirror-schema-list';
import {
  type ContentAdapterModule,
  type RelationGraphAsList,
  type RelationTriple,
  titleSchema,
  ROOT_SUBJECT,
} from 'anafero/index.mjs';
import nodeViews from './nodeViews.jsx';

import * as classNames from './style.css';


type AnnotationCallback = (
  type: 'footnote',
  nodes: ProseMirrorNode[],
  id: string,
  cue?: string,
) => void


const tn = tableNodes({
  tableGroup: 'block',
  cellContent: 'block*',
  cellAttributes: {
    background: {
      default: null,
      getFromDOM(dom) {
        return dom.style?.backgroundColor || null;
      },
      setDOMAttr(value, attrs) {
        if (value)
          attrs.style = `${attrs.style || ''}; background-color: ${value};`;
      },
    },
  },
});


tn.table.attrs = {
  // Colgroup support.
  colWidths: {
    default: [] as string[],
  },
};
tn.table.toDOM = function (node) {
  if ((node.attrs.colWidths ?? []).length > 0) {
    const cols = node.attrs.colWidths.map((width: string) =>
      ['col', { width }]
    );
    const colgroup = ['colgroup', ...cols];
    return ['table', colgroup, ['tbody', 0]];
  } else {
    // Original behavior from prosemirror-tables:
    return ['table', ['tbody', 0]];
  }
};


const clauseSchemaBase = new Schema({
  nodes: {
    text: {
      inline: true,
    },
    doc: {
      content: 'title block* footnotes?',
      parseDOM: [{ tag: 'article' }],
      toDOM() {
        return ['article', 0];
      },
    },
    title: {
      content: '(text | flow)*',
      toDOM() {
        return ['h1', 0];
      },
    },
    paragraph: {
      attrs: {
        resourceID: {
          default: '',
        },
      },
      content: '(text | flow)*',
      group: 'block',
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['p', attrs, 0];
      },
    },
    footnotes: {
      content: 'footnote+',
      toDOM() {
        return ['footer', { class: classNames.footnotes }, 0];
      },
    },
    footnote: {
      attrs: {
        // Footnote reference for navigation purposes.
        // Is not the same as cue (e.g., “a)”)
        // and can be an auto-generated UUID.
        resourceID: {
          default: undefined,
        },
        cue: {
          default: undefined,
        },
      },
      content: 'block+',
      toDOM(node) {
        return ['aside',
          {
            class: classNames.footnote,
            //id: node.attrs.resourceID,
            about: node.attrs.resourceID,
          },
          ['div', { class: classNames.footnoteCue }, node.attrs.cue],
          ['div', { class: classNames.footnoteBody }, 0],
        ];
      }
    },
    footnote_cue: {
      inclusive: false,
      inline: true,
      group: 'flow',
      content: 'resource_link',
      toDOM() {
        return ['span', {
          class: classNames.footnoteCue,
        }, 0];
      },
    },
    source_listing: {
      attrs: {
        formattedSource: {
          default: undefined,
        },
        resourceID: {
          default: '',
        },
      },
      content: '(text | flow)*',
      group: 'block',
      toDOM(node) {
        const el = document.createElement('pre');
        el.setAttribute('about', node.attrs.resourceID);
        el.innerHTML = node.attrs.formattedSource;
        return el;
      },
    },

    definition_list: {
      content: '(dt | dd)+',
      group: 'block',
      toDOM() {
        return ['dl', 0];
      },
    },
    dt: {
      content: 'paragraph*',
      inline: false,
      toDOM() {
        return ['dt', 0];
      },
    },
    dd: {
      content: 'block*',
      toDOM() {
        return ['dd', 0];
      },
    },

    // Terms clause doesn’t fit into DL/DT/DD schema,
    // because terms are not wrapped in a single root element.
    termWithDefinition: {
      content: 'termXrefLabel? term+ definition+',
      group: 'block',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['section', attrs, 0];
      },
    },

    // TODO: Simply use the ordinary xrefLabel?
    termXrefLabel: {
      content: '(text | flow)*',
      toDOM() {
        return ['span', { class: classNames.termXrefLabel }, 0];
      },
    },
    term: {
      content: '(text | flow)*',
      attrs: {
        preferred: {
          // Whether the term is preferred
          default: undefined,
        },
      },
      toDOM(node) {
        return [
          node.attrs.preferred
            ? 'strong'
            : 'span',
          { 'aria-role': 'term' },
          0,
        ];
      },
    },
    definition: {
      content: 'block*',
      toDOM() {
        return ['div', { 'aria-role': 'definition' }, 0];
      },
    },

    external_link: {
      attrs: {
        href: {
          // Placeholder
          default: 'https://example.com/',
        },
      },
      inclusive: false,
      inline: true,
      group: 'flow',
      content: '(flow | text)*',
      toDOM(node) {
        return ['a', {
          href: node.attrs.href,
        }, node.textContent
          ? 0
          : node.attrs.href];
      },
    },

    // Named inconsistently to avoid clashing with PM stock table nodes
    tableFigure: {
      content: 'figCaption? (image | table)',
      group: 'block',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['figure', attrs, 0];
      },
    },

    figure: {
      content: '(image | arbitrary_literal_block) figCaption?',
      group: 'block',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['figure', attrs, 0];
      },
    },
    example: {
      content: 'xrefLabel+ block* figCaption?',
      group: 'block',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['figure', attrs, 0];
      },
    },
    figCaption: {
      content: '(text | flow)*',
      toDOM() {
        return ['figcaption', { class: classNames.figCaption }, 0];
      },
    },
    image: {
      attrs: {
        src: {
          // Placeholder
          default: 'data:image/png;base64,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',
        },
        width: {
          default: '',
        },
      },
      toDOM(node) {
        return ['img', {
          src: node.attrs.src,
          width: node.attrs.width || 'auto',
        }];
      },
      isLeaf: true,
    },

    anchor: {
      group: 'flow',
      inline: true,
      isLeaf: true,
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        return ['a', {
          name: node.attrs.resourceID,
          id: node.attrs.resourceID,
        }];
      },
    },

    admonition: {
      attrs: {
        // An array of strings. E.g., ['note', 'commentary']
        tags: {
          default: undefined,
        },
        resourceID: {
          default: '',
        },
      },
      content: 'xrefLabel+ block*',
      group: 'block',
      toDOM(node) {
        return ['aside', {
          about: node.attrs.resourceID ?? undefined,
          class: `
            ${classNames.admonition}
            ${(node.attrs.tags ?? []).
              map((tag: string) => classNames[`admonition-${tag}`]).
              join(' ')}
          `,
        }, 0];
      },
    },

    xrefLabel: {
      content: '(text | flow)*',
      toDOM() {
        return ['header', { class: classNames.xrefLabel }, 0];
      },
    },

    math: {
      attrs: {
        /** HTML markup, from the outer <math> tag and down. */
        mathML: {
          default: '',
        },
      },
      inline: true,
      group: 'flow',
      toDOM(node) {
        const el = document.createElement('span');
        el.innerHTML = node.attrs.mathML;
        return el;
      },
    },

    ...tn,

    // // Table of subclauses
    // parts: {
    //   content: 'part_entry+',
    //   toDOM(node) {
    //     return ['ul', { class: 'toc' }, 0];
    //   },
    // },
    // part_entry: {
    //   content: 'resource_link',
    //   toDOM() {
    //     return ['li', 0];
    //   },
    // },

    linebreak: {
      group: 'flow',
      inline: true,
      content: '',
      toDOM() {
        return ['br'];
      },
    },
    span: {
      group: 'flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['span', 0];
      },
    },
    underline: {
      group: 'flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['span', { class: classNames.underlined }, 0];
      },
    },
    arbitrary_literal_block: {
      content: '(text | flow)*',
      toDOM() {
        return ['pre', 0];
      },
    },
    code: {
      group: 'flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['code', 0];
      },
    },
    resource_link: {
      attrs: {
        href: {
          // Should be a resource ID/URI
          // Would be resolved by node view or serialized DOM post-processor
          default: undefined,
        },
      },
      inclusive: false,
      inline: true,
      group: 'flow',
      content: '(text | flow)*',
      toDOM(node) {
        return ['a', {
          href: node.attrs.href,
        }, 0];
      },
    },
  },
});


const clauseSchema = new Schema({
  nodes: addListNodes(
    clauseSchemaBase.spec.nodes,
    'paragraph block*', 'block',
  ),
  marks: clauseSchemaBase.spec.marks,
});


const collectionEntrySchema = new Schema({
  nodes: {
    text: {},
    doc: {
      content: 'title',
      toDOM() {
        return ['article', 0];
      },
    },
    title: {
      content: 'text*',
      toDOM() {
        return ['h1', 0];
      },
    },
  },
});


const coverBibdataSchema = new Schema({
  nodes: {
    text: {},
    doc: {
      content: 'docMeta mainTitle someOtherTitle*',
      parseDOM: [{ tag: 'article' }],
      toDOM() {
        return ['article', 0];
      },
    },
    mainTitle: {
      content: 'text*',
      toDOM() {
        return ['h1', 0];
      },
    },
    someOtherTitle: {
      content: 'text*',
      toDOM() {
        return ['p', 0];
      },
    },
    docMeta: {
      content: 'primaryDocID edition pubDate author',
      toDOM() {
        return ['div', { class: 'docMeta', style: 'color: green;' }, 0];
      },
    },
    primaryDocID: {
      content: 'text*',
      toDOM() {
        return ['div', 0];
      },
    },
    author: {
      content: 'text*',
      toDOM() {
        return ['div', 0];
      },
    },
    edition: {
      content: 'text*',
      toDOM() {
        return ['div', 0];
      },
    },
    pubDate: {
      content: 'text*',
      toDOM() {
        return ['div', 0];
      },
    },
  },
  marks: {},
});


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

function getSectionPlainTitle(section: Readonly<RelationGraphAsList>): string | undefined {

  const clauseNumber = resolveChain(section, ['hasClauseNumber'], ROOT_SUBJECT)[0]?.[1];

  const parts = resolveChain(section, ['hasPart', 'type'], ROOT_SUBJECT);

  const plainTitleIDs = parts.filter(([pID, type]) => type === 'title').
    map(([pID]) => pID);
  const plainTitles = plainTitleIDs.map(id =>
    findAll(section, id, 'hasPart').join(' '));

  return plainTitles[0]
    ? `${clauseNumber ?? ''}${clauseNumber ? '  ' : ''}${plainTitles[0]}`
    : undefined;
}


const mod: ContentAdapterModule = {
  name: "Metanorma site content",
  version: "0.0.1",
  describe: (relations) => {
    // We won’t know the language if it’s a section :(
    const primaryLanguageID = getCurrentLanguage(relations);

    const labelInPlainText = getBibdataDocid(relations)
      ?? getSectionPlainTitle(relations)
      // First few characters of any direct relation that is not a URI?
      ?? relations.
           find(([s, p, o]) =>
             s === ROOT_SUBJECT
             && p !== 'type'
             && o.trim() !== ''
             // TODO: Stop testing URI by urn: prefix
             && !o.startsWith('urn:'))?.[2].
           slice(0, 20)
      ?? "Untitled resource";

    return (primaryLanguageID
      ? { labelInPlainText, primaryLanguageID }
      : { labelInPlainText });
  },
  contributingToHierarchy: [
    ['hasPart', 'hasClauseIdentifier'],
    ['hasPart', 'hasBibdata', 'hasDocidentifier', 'hasPart'],
  ],
  crossReferences: (rel) => {
    return rel.predicate === 'hasTarget';
  },
  // This is not used currently?
  contributesToContent: (relation, targetRelations) => {
    return relation.predicate === 'hasPart' || relation.predicate === 'hasText';
  },
  generateContent: function (relations) {
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

    return generator(relations);
  },
  resourceContentProseMirrorSchema: {
    cover: coverBibdataSchema,
    clause: clauseSchema,
  },
  resourceContentProseMirrorOptions: {
    nodeViews,
  },
}

export default mod;


type ContentGenerator = ContentAdapterModule['generateContent'];
const generatorsByType: Record<string, ContentGenerator> = {

  document: function generateDoc (doc) {
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
    return generateCoverPage(currentLanguage, docid)
      (relativeGraph(doc, bibdataID));
  },

  section: function generateDoc (section) {

    const simpleNodes: Record<string, string> = {
      //'unorderedList': 'bullet_list',
      'orderedList': 'ordered_list',
      //'paragraph': 'paragraph',
      //'sourcecode': 'source_listing',
      'span': 'span',

      // TODO: Figure out what to do with underlines. <u> isn’t fit
      'underline': 'underline',
      'bookmark': 'anchor',

      'dl': 'definition_list',
      'dd': 'dd',
      'dt': 'dt',
      'br': 'linebreak',
      'tt': 'code',
      'semx': 'span',
      //'tableCell': 'table_cell',
    };

    const blockNodesNestedInParagraphs = [
      'note',
      'orderedList',
      'unorderedList',
    ];

    /**
     * Processes content for a list, wrapping non-list-item nodes
     * (e.g., notes) in list items.
     */
    function makeListContents(subj: string, onAnnotation?: AnnotationCallback) {
      const parts = findAll(section, subj, 'hasPart');
      const contents: ProseMirrorNode[] = [];
      for (const part of parts) {
        const type = findValue(section, part, 'type');
        if (type) {
          const maybeNodes = makeNodeOrNot(part, type, onAnnotation);
          const maybeNode = (Array.isArray(maybeNodes))
            ? maybeNodes[0]
            : maybeNodes;
          if (maybeNode) {
            if (type !== 'listItem') {
              const content = type === 'paragraph'
                ? [maybeNode]
                : [pm.node('paragraph', null, [pm.text(' ')]), maybeNode];
              contents.push(pm.node(
                'list_item',
                null,
                content));
            } else {
              contents.push(maybeNode);
            }
          }
        }
      }
      return contents;
    }

    /**
     * Maps resource’s `type` predicate value to PM node constructor.
     * PM node constructor can return a PM node, or a list of PM nodes,
     * or undefined. Constroctor can invoke onAnnotation callback
     * if a block is encountered that should be placed elsewhere
     * and referenced from the contents, providing the callback
     * with annotation type (e.g., footnote), nodes, and a unique reference.
     */
    const customNodes: Record<
      string,
      (
        subj: string,
        onAnnotation?: AnnotationCallback,
      ) => ProseMirrorNode | undefined | (ProseMirrorNode | undefined)[]
    > = {
      'unorderedList': (subj, onAnnotation) => {
        return pm.node('bullet_list', { resourceID: subj }, makeListContents(subj, onAnnotation));
      },
      'orderedList': (subj, onAnnotation) => {
        return pm.node('ordered_list', { resourceID: subj }, makeListContents(subj, onAnnotation));
      },
      'paragraph': (subj, onAnnotation) => {
        const nodes: ProseMirrorNode[] = [];

        let paragraphCounter = 0;
        const currentParagraphParts: string[] = [];

        /**
         * Processes accumulated so far paragraph parts
         * into a paragraph node and appends it to content.
         */
        function flushParagraph() {
          if (currentParagraphParts.length < 1) {
            return;
          }
          const paragraphContents: ProseMirrorNode[] = [];
          for (const part of currentParagraphParts) {
            if (hasSubject(section, part)) {
              // This part is a nested element
              const partType = findValue(section, part, 'type');
              if (partType) {
                const nodes = makeNodeOrNot(part, partType, onAnnotation);
                for (const node of (Array.isArray(nodes) ? nodes : [nodes]).filter(n => n !== undefined)) {
                  paragraphContents.push(node);
                }
              }
            } else {
              // This part is a text node
              paragraphContents.push(pm.text(part))
            }
          }
          nodes.push(pm.node(
            'paragraph',
            { resourceID: `${subj}-split-${paragraphCounter}` },
            paragraphContents,
          ));
          paragraphCounter += 1;
        }

        const parts = findAll(section, subj, 'hasPart');
        for (const part of parts) {
          const partType = findValue(section, part, 'type');
          if (partType && blockNodesNestedInParagraphs.includes(partType)) {
            flushParagraph();
            const _blockNodes = customNodes[partType]!(part, onAnnotation);
            const blockNodes = Array.isArray(_blockNodes)
              ? _blockNodes
              : [_blockNodes];
            for (const node of blockNodes.filter(n => n !== undefined)) {
              nodes.push(node);
            }
          } else {
            currentParagraphParts.push(part);
          }
        }
        flushParagraph();

        return nodes;
      },
      'link': (subj: string) => {
        const target = findValue(section, subj, 'hasTarget');
        if (!target) {
          console.warn("Cannot create a link without target/href");
          return undefined;
        }
        if (target.startsWith('http')) {
          return pm.node('external_link', { href: target }, generateContent(subj, pm.nodes.external_link!));
        } else {
          console.warn("Unexpected link target!", target);
          return undefined;
        }
      },
      'stem': (subj: string) => {
        const mathML = findValue(section, subj, 'hasMathML');
        return pm.node('math', { mathML });
      },
      'sourcecode': (subj: string) => {
        const formattedSource = findValue(section, subj, 'hasFormattedSource');
        if (!formattedSource) {
          console.warn("Sourcecode lacks formatted source");
          return undefined;
        }
        return pm.node('source_listing', { resourceID: subj, formattedSource });
      },
      'xref': (subj: string) => {
        const target = findValue(section, subj, 'hasTarget');
        if (!target) {
          console.warn("Cannot create a resource link without target/href");
          return undefined;
        }
        return pm.node(
          'resource_link',
          { href: target },
          generateContent(subj, pm.nodes.resource_link!));
      },
      'term': (subj: string) => {
        const xrefLabel = findPartsOfType(section, subj, 'fmt-xref-label')[0];
        const preferred = findPartsOfType(section, subj, 'preferred')[0];
        const preferredExpression = preferred
          ? findPartsOfType(section, preferred, 'expression')[0]
          : undefined;
        const preferredExpressionContent = preferredExpression
          ? findPartsOfType(section, preferredExpression, 'name')[0]
          : undefined;
        const definition = findPartsOfType(section, subj, 'fmt-definition')[0];

        if (!xrefLabel || !preferredExpressionContent || !definition) {
          console.warn("Cannot represent a term without xref label, preferred & definition");
          return undefined;
        }

        const content = [
          pm.node('term', { preferred: true }, generateContent(preferredExpressionContent, pm.nodes.term!)),
          pm.node('definition', null, generateContent(definition, pm.nodes.definition!)),
        ];
        if (xrefLabel) {
          content.splice(0, 0, pm.node('termXrefLabel', null, generateContent(xrefLabel, pm.nodes.termXrefLabel!)));
        }

        return pm.node(
          'termWithDefinition',
          { resourceID: subj },
          content,
        );
      },
      'example': (subj, onAnnotation) => {
        //const caption = findValue(section, subj, 'hasFmtName');
        const captionParts = findPartsOfType(section, subj, 'fmt-name');

        // TODO: Refactor this, probably with generateContent, see admonition/note
        const contents: ProseMirrorNode[] = [];
        for (const part of findAll(section, subj, 'hasPart')) {
          const type = findValue(section, part, 'type');
          if (type) {
            const node = makeNodeOrNot(part, type, onAnnotation);
            const nodes = Array.isArray(node) ? node : [node];
            for (const node of nodes.filter(n => n !== undefined)) {
              contents.push(node);
            }
          }
        }
        const xrefLabels = findPartsOfType(section, subj, 'fmt-xref-label');
        xrefLabels.reverse();
        for (const xrefLabel of xrefLabels) {
          contents.splice(0, 0, pm.node(
            'xrefLabel',
            null,
            generateContent(xrefLabel, pm.nodes.xrefLabel!),
          ));
        }
        if (captionParts.length > 0) {
          contents.push(pm.node(
            'figCaption',
            null,
            captionParts.flatMap(part => generateContent(part, pm.nodes.figCaption!)),
          ));
        }
        // We will wrap the example in a figure.
        return pm.node('example', { resourceID: subj }, contents);
      },
      'note': (subj, onAnnotation) => {
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
          flatMap(([part, partType]) => makeNodeOrNot(part!, partType!, onAnnotation)).
          filter(n => n !== undefined);

        const xrefLabel = findPartsOfType(section, subj, 'fmt-xref-label')[0];
        if (xrefLabel) {
          contents.splice(0, 0, pm.node(
            'xrefLabel',
            null,
            generateContent(xrefLabel, pm.nodes.xrefLabel!),
          ));
        }

        return pm.node('admonition', { resourceID: subj, tags }, contents);
      },
      'footnote': (subj, onAnnotation) => {
        const cue = findValue(section, subj, 'hasReference');
        if (!cue) {
          console.error("Cannot create a footnote without reference");
          return undefined;
        }
        //const aUUID = crypto.randomUUID();
        //const resourceID = `urn:x-metanorma-footnote:${aUUID}`
        const footnoteContent = generateContent(subj, 'block', onAnnotation);
        onAnnotation?.(
          'footnote',
          footnoteContent,
          subj,
          cue,
        );
        return pm.node(
          'footnote_cue',
          null,
          [
            pm.node('resource_link', { href: subj }, [pm.text(cue)])
          ],
        );
      },
      'table': (subj, onAnnotation) => {
        const caption = findValue(section, subj, 'hasFmtName');
        //const caption = name ? findValue(section, name, 'hasPart') : null;

        const tbody = findValue(section, subj, 'hasTableBody');
        const thead = findValue(section, subj, 'hasTableHeader');
        let rows: string[] = [];
        if (thead) {
          rows.push(...findAll(section, thead, 'hasTableRow'));
        }
        if (!tbody) {
          console.warn("Tables without tbody are not expected");
          rows.push(...findAll(section, subj, 'hasTableRow'));
        } else {
          rows.push(...findAll(section, tbody, 'hasTableRow'));
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
                },
                generateContent(cellID, pm.nodes.table_cell!, onAnnotation),
              )
            ),
          )
        ));

        if (tableContents.length < 1) {
          return undefined;
        }

        //console.debug(tableContents);
        const contents = [
          pm.node('table', colWidths ? { colWidths } : null,
            tableContents),
        ];
        if (caption) {
          contents.splice(0, 0, pm.node('figCaption', null, generateContent(caption, pm.nodes.figCaption!)));
        }
        // We will wrap the table in a figure, because PM’s default tables
        // don’t have captions or resourceID.
        // TODO: implement fully custom tables for parity with MN?
        return pm.node('tableFigure', { resourceID: subj }, contents);
      },
      'bibitem': (subj: string) => {
        const contents: ProseMirrorNode[] = [];
        const tagSubj = findValue(section, subj, 'hasBiblioTag');
        const tag = tagSubj ? findValue(section, tagSubj, 'hasPart') : null;
        if (tag) {
          contents.push(pm.node('span', null, [pm.text(tag), pm.text(' ')]));
        }
        const formattedref = findValue(section, subj, 'hasFormattedref');
        if (formattedref) {
          contents.push(...generateContent(formattedref, pm.nodes.span!));
        }
        const uris = findAll(section, subj, 'hasUri');
        contents.push(...uris.map(uri =>
          [findValue(section, uri, 'hasPart'), findValue(section, uri, 'hasType')]
        ).filter(([href, ]) => href !== '' && href !== undefined).flatMap(([href, type]) => [
          pm.text(' '),
          pm.node(
            'external_link',
            { href },
            pm.text(`[${type ?? 'link'}]`),
          ),
        ]));
        return pm.node('paragraph', { resourceID: subj }, contents);
      },
      'listItem': (subj: string) => {
        const firstPart = findValue(section, subj, 'hasPart');
        if (!firstPart) {
          return undefined;
        }
        const firstPartTypes = findAll(section, firstPart, 'type');
        const content = generateContent(subj, pm.nodes.list_item!);
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
      'figure': (subj: string) => {
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
            pm.node('image', { src: imgSrc, width }),
          );
        } else if (arbitraryLiteralBlock) {
          const parts = generateContent(arbitraryLiteralBlock, pm.nodes.arbitrary_literal_block!);
          figureContents.push(
            pm.node('arbitrary_literal_block', null, parts),
          );
        }
        const caption = findValue(section, subj, 'hasFmtName');
        if (caption) {
          figureContents.push(
            pm.node('figCaption', null, generateContent(caption, pm.nodes.figCaption!)),
          );
        }
        return pm.node('figure', { resourceID: subj }, figureContents);
      },
    };
    function makeNodeOrNot(
      subj: string,
      subjType: string,
      onAnnotation?: AnnotationCallback,
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
        const content = generateContent(subj, nodeType, onAnnotation);
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
        return customNodes[subjType](subj, onAnnotation);
      } else {
        return undefined;
      }
    }
    function generateContent(
      subject: string,
      subjectNodeType: ProseMirrorNodeType | 'block' | 'inline',
      onAnnotation?: AnnotationCallback,
    ): ProseMirrorNode[] {
      const allSubparts: ProseMirrorNode[] =
      // TODO: subject is really only used to resolve relations,
      // maybe this can be refactored out of this function.
      resolveChain(section, ['hasPart'], subject).
      flatMap(([, partValue]) => {
        // TODO: Don’t rely on urn: prefix when determining subjectness
        if (!partValue.startsWith('urn:')) {
          // Part itself is not a subject, so treat as text.
          if (partValue.trim() !== '') {
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
            const maybeNode = makeNodeOrNot(partValue, type, onAnnotation);
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
            console.warn("Trying to create a block in an inline-content node?", subjectNodeTypeRepr, allSubparts.map(n => n.textContent).join(', '));
            return allSubparts.
            map(n => n.isInline
              ? n
              //: (new Transform(n).doc.textContent.toString() ?? ''))
              : pm.text(n.textContent))
          } else if (!subjectNodeType.inlineContent && allSubparts.find(node => node.isInline)) {
            //return allSubparts;
            if (allSubparts.find(node => !node.isInline)) {
              console.error("Mixing inline and block content :(", subject, subjectNodeTypeRepr, allSubparts.filter(node => !node.isInline).map(n => n.toString()));
              return allSubparts.map(n =>
                n.isInline
                  ? pm.node('paragraph', null, [n])
                  : n)
            } else {
              return [pm.node('paragraph', null, allSubparts)];
            }
          } else {
            return allSubparts;
            console.error("Something went wrong", subject, subjectNodeType.name);
          }
        }
      } else {
        if (subjectNodeType === 'inline' && allSubparts.find(n => !n.isInline)) {
          console.warn("Trying to create a block in an inline-content node? Will unwrap text content.", subjectNodeTypeRepr, allSubparts.map(n => n.textContent).join(', '));
          return allSubparts.
          map(n => n.isInline
            ? n
            //: (new Transform(n).doc.textContent.toString() ?? ''))
            : pm.text(n.textContent))
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

    const pm = clauseSchema;

    const labelInPlainText = getSectionPlainTitle(section);
    if (!labelInPlainText) {
      throw new Error("Cannot generate clause: missing title");
    }

    const title = findPartsOfType(section, ROOT_SUBJECT, 'fmt-title')[0];
    const titleContent = title
      ? generateContent(title, pm.nodes.title!)
      : undefined;

    // Footnote nodes only
    const footnotes: ProseMirrorNode[] = [];
    const handleAnnotation: AnnotationCallback =
    function handleAnnotation (type, nodes, resourceID, cue) {
      // For now there are no other types of annotations, so
      // no need to compare `type`
      footnotes.push(pm.node('footnote', { resourceID, cue }, nodes));
    }

    const docContents = generateContent(
      ROOT_SUBJECT,
      pm.nodes.doc!,
      handleAnnotation,
    );

    if (footnotes.length > 0) {
      docContents.push(pm.node('footnotes', null, footnotes));
    }

    //const clauses = makeTableOfClauses(section);
    //if (clauses) {
    //  docContents.push(clauses);
    //}

    const contentDoc = pm.node(pm.topNodeType, null, [
      pm.node('title', null, titleContent ?? [pm.text(labelInPlainText)]),
      ...docContents,
    ]).toJSON();

    return {
      labelInPlainText,
      title: titleSchema.node('doc', null, [
        titleSchema.text(labelInPlainText),
      ]).toJSON(),
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


const generateCoverPage: (lang: string, docid: string) => ContentGenerator =
(currentLanguage, primaryDocid) => function (bibdata) {
  const titles = resolveChain(bibdata, ['hasTitle', 'hasPart']);
  const plainMainTitles = titles.filter(([titleID, ]) =>
    findValue(bibdata, titleID, 'hasType') === 'main' &&
    findValue(bibdata, titleID, 'hasFormat') === 'text/plain'
  );
  const mainTitleInCurrentLanguage = plainMainTitles.find(([titleID, ]) =>
    findValue(bibdata, titleID, 'hasLanguage') === currentLanguage
  ) ?? titles.find(([titleID, ]) =>
    findValue(bibdata, titleID, 'hasFormat') === 'text/plain'
  );

  if (!mainTitleInCurrentLanguage) {
    console.error("Avialable titles", JSON.stringify(plainMainTitles));
    throw new Error("Cannot generate cover page: missing main title in current language");
  }

  const editions = resolveChain(bibdata, ['hasEdition', 'hasPart']);
  /** Edition text, preferably in current language */
  const edition = editions.find(([editionID, ]) =>
    findValue(bibdata, editionID, 'hasLanguage') === currentLanguage
  )?.[1] ?? editions[0]?.[1];

  if (!edition) {
    throw new Error("Cannot generate cover page: missing edition");
  }

  //const revisionDate = resolveChain(bibdata, ['hasVersion', 'hasRevisionDate'])[0]?.[1];

  const dates = resolveChain(bibdata, ['hasDate', 'hasPart']);
  const pubDate = dates.find(([dateURI, ]) =>
    findValue(bibdata, dateURI, 'hasType') === 'published',
  )?.[1] ?? 'unknown publication date';

  const contributors = resolveChain(bibdata, ['hasContributor']);
  const authorAndPublisherOrgURIs = contributors.
    filter(([, contribURI]) => {
      const roles = resolveChain(bibdata, ['hasRole', 'hasType'], contribURI);
      return roles.find(([, roleType]) => roleType === 'author' || roleType === 'publisher') !== undefined;
    }).
    map(([, contribURI]) => findValue(bibdata, contribURI, 'hasOrganization')).
    filter((orgURI) => orgURI !== null);
  const authorsAndPublishers = Array.from(new Set(authorAndPublisherOrgURIs.map(uri =>
    resolveChain(bibdata, ['hasName'], uri)[0]?.[1]
  ).filter(name => name !== undefined)));
  const author = authorsAndPublishers[0] ?? 'unknown contributors';

  const pm = coverBibdataSchema;
  return {
    contentSchemaID: 'cover',
    primaryLanguageID: currentLanguage,
    labelInPlainText: mainTitleInCurrentLanguage[1],
    title: titleSchema.node('doc', null, [
      titleSchema.text(mainTitleInCurrentLanguage[1]),
    ]).toJSON(),
    contentDoc: pm.node('doc', null, [
      pm.node('docMeta', null, [
        pm.node('primaryDocID', null, [pm.text(primaryDocid)]),
        pm.node('edition', null, [pm.text(edition)]),
        pm.node('pubDate', null, [pm.text(pubDate)]),
        pm.node('author', null, [pm.text(author)]),
      ]),
      pm.node('mainTitle', null, [pm.text(mainTitleInCurrentLanguage[1])]),
      // The rest of the main titles, excluding the main one
      ...plainMainTitles.
        filter(([uri, ]) => uri !== mainTitleInCurrentLanguage[0]).
        map(([, titleText]) =>
          pm.node('someOtherTitle', null, [pm.text(titleText)]),
        ),
    ]).toJSON(),
  };
};


///** Returns true if given node is allowed in given node type. */
//function canCreateInlineContent(inNodeOfType: ProseMirrorNodeType): boolean {
//  try {
//    return inNodeOfType.validContent(Fragment.from(node));
//  } catch (e) {
//    console.error("Cannot create node", e);
//    return false;
//  }
//}

// /** Returns true if given node is allowed in given node type. */
// function canCreate(node: ProseMirrorNode, inNodeOfType: ProseMirrorNodeType): boolean {
//   try {
//     return inNodeOfType.validContent(Fragment.from(node));
//   } catch (e) {
//     console.error("Cannot create node", e);
//     return false;
//   }
// }
// 

///**
// * Runs valueChecker for every value of matching chain,
// * and returns matching relations. */
//function match(
//  relations: Readonly<RelationGraphAsList>,
//  chain: string[],
//  valueChecker: (val: string) => boolean,
//): RelationTriple<string, string>[] {
//}

/**
 * Given a chain of predicates like [hasLanguage, hasText],
 * returns a list of subjects that have that predicate and its value
 * (like [[someLanguageID, ja], [anotherLanguageID, en]]).
 */
function resolveChain(
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
function findValue(
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
function findAll(
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
function findPartsOfType(
  graph: Readonly<RelationGraphAsList>,
  subj: string,
  type: string,
): string[] {
  return findAll(graph, subj, 'hasPart').
    filter(part => findValue(graph, part, 'type') === type);
}

function relativeGraph(relations: Readonly<RelationGraphAsList>, subj: string): Readonly<RelationGraphAsList> {
  return relations.
    filter(([s, ]) => s !== ROOT_SUBJECT).
    map(([s, p, o]) => [s === subj ? ROOT_SUBJECT : s, p, o]);
}

/** Returns true if subject is present in the graph. */
function hasSubject(relations: Readonly<RelationGraphAsList>, subj: string) {
  return relations.find(([s, ]) => s === subj) !== undefined;
}

/**
 * Returns all relations from given subject,
 * recursively resolving any targets that also serve as subjects.
 */
function getAllRelations(
  relations: Readonly<RelationGraphAsList>,
  subj: string,
  depth: number | undefined = undefined,
  _seen?: Set<string>,
): Readonly<RelationGraphAsList> {
  const seen = _seen ?? new Set();
  return relations.map(([s, p, o]): Readonly<RelationGraphAsList> => {
    if (s === subj) {
      console.debug("Got relation", p, o)
      const subjectGraph = [
        [s, p, o] as RelationTriple<string, string>,
      ];
      if (depth === undefined || depth > 0) {
        seen.add(o);
        subjectGraph.push(...getAllRelations(relations, o, depth ? depth - 1 : depth, seen));
      }
      return subjectGraph;
    } else {
      return [];
    }
  }).flat();
}
