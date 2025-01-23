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
      content: 'title block*',
      parseDOM: [{ tag: 'article' }],
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
    source_listing: {
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
        return ['pre', attrs, 0];
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
    figure: {
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
    example: {
      content: 'figCaption? block*',
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
      },
      toDOM(node) {
        return ['img', {
          src: node.attrs.src,
        }];
      },
      isLeaf: true,
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

    span: {
      group: 'flow',
      content: '(text | flow)*',
      inline: true,
      toDOM() {
        return ['span', 0];
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

    const labelInPlainText = getSectionPlainTitle(section);
    if (!labelInPlainText) {
      throw new Error("Cannot generate clause: missing title");
    }

    const simpleNodes: Record<string, string> = {
      'unorderedList': 'bullet_list',
      'orderedList': 'ordered_list',
      'paragraph': 'paragraph',
      'sourcecode': 'source_listing',
      'span': 'span',
      'dl': 'definition_list',
      'dd': 'dd',
      'dt': 'dt',
      'tt': 'code',
      'semx': 'span',
      //'tableCell': 'table_cell',
    };
    const customNodes:
    Record<string, (subj: string) => ProseMirrorNode | undefined> = {
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
      'xref': (subj: string) => {
        const target = findValue(section, subj, 'hasTarget');
        if (!target) {
          console.warn("Cannot create a resource link without target/href");
          return undefined;
        }
        return pm.node('resource_link', { href: target }, generateContent(subj, pm.nodes.resource_link!));
      },
      'example': (subj: string) => {

        const captionID = findAll(section, subj, 'hasPart').
        find(part => findValue(section, part, 'type') === 'name');

        // Find caption parts that are plain text, don’t expect relations there for now
        const captionParts = captionID
          ? findAll(section, captionID, 'hasPart').filter(part => !hasSubject(section, part))
          : null;

        const contents: ProseMirrorNode[] = [];
        for (const part of findAll(section, subj, 'hasPart')) {
          const type = findValue(section, part, 'type');
          if (type) {
            const node = makeNodeOrNot(part, type);
            if (node) {
              contents.push(node);
            }
          }
        }
        if (captionParts) {
          contents.splice(0, 0, pm.node('figCaption', null, captionParts.map(p => pm.text(p))));
        }
        // We will wrap the example in a figure.
        return pm.node('example', { resourceID: subj }, contents);
      },
      'table': (subj: string) => {
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
                generateContent(cellID, pm.nodes.table_cell!),
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
        return pm.node('figure', { resourceID: subj }, contents);
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
        const content: ProseMirrorNode[] = [];
        const firstPart = findValue(section, subj, 'hasPart');
        if (!firstPart) {
          return undefined;
        }
        const firstPartTypes = findAll(section, firstPart, 'type');
        if (!firstPartTypes.includes('paragraph')) {
          console.warn("Inserting leading paragraph for valid list item");
          content.push(pm.node('paragraph', null, [pm.text("_")]));
        }
        content.push(...generateContent(subj, pm.nodes.list_item!));
        //console.debug("processing list item", subj, JSON.stringify(pm.node('list_item', null, content).toJSON()), null, 2);
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
        const svgContents = svg
          ? findValue(section, svg, 'hasSVGContents')
          : undefined;
        if (!imgSrc && !svgContents) {
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
            pm.node('image', { src: imgSrc }),
          );
        }
        const name = findValue(section, subj, 'hasName');
        const caption = name ? findValue(section, name, 'hasPart') : null;
        if (caption) {
          if (hasSubject(section, caption)) {
            console.warn(
              "Figure captions with complex contents are not yet supported, got",
              getAllRelations(section, caption));
          } else {
            figureContents.splice(0, 0,
              pm.node('figCaption', null, [pm.text(caption)]),
            );
          }
        }
        return pm.node('figure', { resourceID: subj }, figureContents);
      },
    };
    function makeNodeOrNot(subj: string, subjType: string):
    ProseMirrorNode | undefined {
      if (simpleNodes[subjType]) {
        const nodeID = simpleNodes[subjType];
        const nodeType = pm.nodes[nodeID];
        if (!nodeType) {
          console.error("No node defined in schema", nodeID);
          return undefined;
        }
        const content = generateContent(subj, nodeType);
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
        return customNodes[subjType](subj);
      } else {
        return undefined;
      }
    }
    function generateContent(subject: string, subjectNodeType: ProseMirrorNodeType): ProseMirrorNode[] {

      const allSubparts: ProseMirrorNode[] =
      // TODO: subject is really only used to resolve relations,
      // maybe this can be refactored out of this function.
      resolveChain(section, ['hasPart'], subject).
      map(([, partValue]) => {
        // TODO: Don’t rely on urn: prefix when determining subjectness
        if (!partValue.startsWith('urn:')) {
          // Part itself is not a subject, so treat as text.
          if (partValue.trim() !== '') {
            return pm.text(partValue);
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
            return undefined;
          }
        } else {
          const types = findAll(section, partValue, 'type');
          // Test against every type relation of this subject,
          // and take the first for which we can create a node.
          for (const type of types) {
            const maybeNode = makeNodeOrNot(partValue, type, subject);
            if (maybeNode) {
              //if (canCreate(maybeNode, subjectNodeType)) {
                return maybeNode;
              //} else {
              //  console.warn("Cannot create node under", subject, subjectNodeType.name, type, maybeNode);
              //}
            }
          }
          return undefined;
        }
      }).
      filter(maybeNode => maybeNode !== undefined);

      if (subjectNodeType.validContent(Fragment.from(allSubparts))) {
        return allSubparts;
      } else {
        if (subjectNodeType.inlineContent && allSubparts.find(node => !node.isInline)) {
          console.warn("Trying to create a block in inline content node?", subject, subjectNodeType.name);
          return allSubparts.
          map(n => n.isInline
            ? n
            //: (new Transform(n).doc.textContent.toString() ?? ''))
            : pm.text(n.textContent))
        } else if (!subjectNodeType.inlineContent && allSubparts.find(node => node.isInline)) {
          //return allSubparts;
          if (allSubparts.find(node => !node.isInline)) {
            console.error("Mixing inline and block content :(", subject, subjectNodeType.name, allSubparts.filter(node => !node.isInline).map(n => n.toString()));
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
      console.error("Something went wrong, and nothing was generated", subject, subjectNodeType.name);
      return [];
    }

    const pm = clauseSchema;

    const docContents = generateContent(ROOT_SUBJECT, pm.nodes.doc!);

    //const clauses = makeTableOfClauses(section);
    //if (clauses) {
    //  docContents.push(clauses);
    //}

    const contentDoc = pm.node(pm.topNodeType, null, [
      pm.node('title', null, [pm.text(labelInPlainText)]),
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
function resolveChain(relations: Readonly<RelationGraphAsList>, chain: string[], subj_?: string): [subj: string, value: string][] {
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
  relations: Readonly<RelationGraphAsList>,
  subj: string,
  pred: string | string[],
): string[] {
  return relations.
    filter(([s, p, ]) =>
      s === subj && (
        (typeof pred === 'string' && p === pred) || pred.includes(p)
      )
    ).
    map(([, , o]) => o);
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
