import { Schema } from 'prosemirror-model';

import { tableNodes } from 'prosemirror-tables';
import { addListNodes } from 'prosemirror-schema-list';

import * as classNames from './style.css';


// Table nodes

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
        if (value) {
          attrs.style = `${attrs.style || ''}; background-color: ${value};`;
        }
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


// Main schema

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
    // title_flow:
    // code | linebreak | external_link | resource_link | strong | em | anchor | sup | math
    title: {
      content: '(text | title_flow)*',
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
            //about: node.attrs.resourceID,
          },
          ['a', { href: 'javascript: void 0;', name: node.attrs.resourceID, id: node.attrs.resourceID, class: classNames.footnoteCue }, node.attrs.cue],
          ['div', { class: classNames.footnoteBody }, 0],

          // Always go back to the first reference, even if the footnote
          // was referenced multiple times.
          ['a', { href: `#footnote-cue-${node.attrs.resourceID}-1` }, '⤴︎'],
        ];
      }
    },
    footnote_cue: {
      inclusive: false,
      inline: true,
      group: 'flow',
      content: 'resource_link',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        return ['span', {
          class: classNames.footnoteCue,
          id: `footnote-cue-${node.attrs.resourceID}`,
        }, 0];
      },
    },
    source_listing: {
      attrs: {
        formattedSource: {
          default: undefined,
        },
      },
      content: '(text | flow)*',
      group: 'block',
      toDOM(node) {
        // FIXME: Find a way to do this without createElement
        const el = document.createElement('pre');
        el.innerHTML = node.attrs.formattedSource;
        return el;
      },
    },

    blockquote: {
      content: 'block+',
      group: 'block',
      toDOM() {
        return ['blockquote', 0];
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
      content: 'termXrefLabel? term+ definition+ termSource*',
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
    termSource: {
      content: '(text | flow)*',
      toDOM() {
        return ['div', 0];
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
      group: 'flow title_flow',
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
      // Why does this one allow image?
      content: 'figCaption? (image | table) block*',
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
      // NOTE: paragraph is allowed as a quick workaround for formula figures
      // (math itself is flow content)
      content: '(image | source_listing | arbitrary_literal_block | paragraph) figCaption?',
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
      content: 'figCaption? xrefLabel* block*',
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
        return ['figure', { ...attrs, class: classNames.exampleFigure }, 0];
      },
    },
    figCaption: {
      content: '(text | flow)*',
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      toDOM(node) {
        const attrs = node.attrs.resourceID
          ? { about: node.attrs.resourceID }
          : {};
        return ['figcaption', { ...attrs, class: classNames.figCaption }, 0];
      },
    },
    image: {
      attrs: {
        src: {
          // Placeholder
          default: 'data:image/png;base64,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',
        },
        width: { default: '' },
        height: { default: '' },
      },
      toDOM(node) {
        return ['img', {
          src: node.attrs.src,
          width: node.attrs.width || 'auto',
          height: node.attrs.height || 'auto',
        }];
      },
      isLeaf: true,
    },

    anchor: {
      group: 'flow title_flow',
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
      group: 'flow title_flow',
      toDOM(node) {
        const el = document.createElement('span');
        el.innerHTML = node.attrs.mathML;
        return el;
      },
    },

    ...tn,

    linebreak: {
      group: 'flow title_flow',
      inline: true,
      content: '',
      toDOM() {
        return ['br'];
      },
    },
    span: {
      group: 'flow title_flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['span', 0];
      },
    },
    strong: {
      group: 'flow title_flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['strong', 0];
      },
    },
    em: {
      group: 'flow title_flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['em', 0];
      },
    },
    sup: {
      group: 'flow title_flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['sup', 0];
      },
    },
    underline: {
      group: 'flow title_flow',
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
      group: 'flow title_flow',
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
      group: 'flow title_flow',
      content: '(text | flow)*',
      toDOM(node) {
        return ['a', {
          href: node.attrs.href,
        }, 0];
      },
    },

    bibitem: {
      attrs: {
        resourceID: {
          default: undefined,
        },
      },
      group: 'block',
      content: '(text | flow)*',
      toDOM(node) {
        return ['article', {
          class: classNames.bibitem,
          about: node.attrs.resourceID ?? undefined,
        }, 0];
      },
    },
  },
});


const baseClauseSchemaSpec = {
  nodes: addListNodes(
    clauseSchemaBase.spec.nodes,
    'paragraph block*',
    'block',
  ),
  marks: clauseSchemaBase.spec.marks,
} as const;

const baseOrderedListSpec = baseClauseSchemaSpec.nodes.get('ordered_list')!;
const baseBulletListSpec = baseClauseSchemaSpec.nodes.get('bullet_list')!;
function fillInAbout(
  originalSpec: [string, ...any[]],
  args: Parameters<Exclude<typeof baseOrderedListSpec['toDOM'], undefined>>,
): ReturnType<Exclude<typeof baseOrderedListSpec['toDOM'], undefined>> {
  const domAttrs = originalSpec[1] !== 0 ? originalSpec[1] : {};
  const pmAttrs = args[0].attrs;
  domAttrs.about = pmAttrs.resourceID;
  return [originalSpec[0], domAttrs, 0];
}
const clauseSchemaSpec = {
  ...baseClauseSchemaSpec,
  nodes: baseClauseSchemaSpec.nodes.update(
    'ordered_list',
    {
      ...baseOrderedListSpec,
      attrs: {
        ...baseOrderedListSpec.attrs,
        resourceID: { default: '' },
      },
      toDOM: function toDOM(...args) {
        return fillInAbout(
          baseOrderedListSpec.toDOM!(...args) as [string, ...any[]],
          args);
      },
    }
  ).update(
    'bullet_list',
    {
      ...baseBulletListSpec,
      attrs: {
        ...baseBulletListSpec.attrs,
        resourceID: { default: '' },
      },
      toDOM: function toDOM(...args) {
        return fillInAbout(
          baseBulletListSpec.toDOM!(...args) as [string, ...any[]],
          args);
      },
    },
  ),
};
export const clauseSchema = new Schema(clauseSchemaSpec);


// const collectionEntrySchema = new Schema({
//   nodes: {
//     text: {},
//     doc: {
//       content: 'title',
//       toDOM() {
//         return ['article', 0];
//       },
//     },
//     title: {
//       content: 'text*',
//       toDOM() {
//         return ['h1', 0];
//       },
//     },
//   },
// });


export const coverBibdataSchema = new Schema({
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
        return ['h1', { class: classNames.mainTitle }, 0];
      },
    },
    someOtherTitle: {
      content: 'text*',
      toDOM() {
        return ['p', { class: classNames.extraTitle }, 0];
      },
    },
    docMeta: {
      content: 'primaryDocID edition pubDate author resource_link*',
      toDOM() {
        return ['div', { class: classNames.docMeta }, 0];
      },
    },
    resource_link: {
      attrs: {
        href: {},
        download: {
          default: false,
        },
      },
      content: 'text*',
      toDOM(node) {
        return ['a', {
          href: node.attrs.href,
          ...(node.attrs.download
            ? { download: node.attrs.download }
            : {}),
        }, 0];
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
