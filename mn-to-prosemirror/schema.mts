import { Schema } from 'prosemirror-model';
import { TAKE_THE_ROOT_TAG } from './xml-parser.mjs';


// TODO: Split into its own package?

export const MNSchema = new Schema({
  nodes: {
    text: {},
    doc: {
      content: 'bibdata preface? sections?',
      parseDOM: [{ tag: 'div' }],
      toDOM() { return ['div'] },
      parseMetanormaDOM: [{ tag: TAKE_THE_ROOT_TAG }],
      toMetanormaDOM() {},
    },
    bibdata: {
      content: 'title+ docidentifier (date | contributor | edition | copyright)*',
    },
    preface: {
      content: 'abstract clause*',
    },
    sections: {
      content: 'clause+',
    },
  },
});
