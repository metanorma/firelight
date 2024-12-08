import { Schema } from 'prosemirror-model';


// TODO: Support more complex title markup
export const titleSchema = new Schema({
  nodes: {
    doc: { content: 'text*' },
    text: {},
  },
});

export type TitleSchema = typeof titleSchema;
