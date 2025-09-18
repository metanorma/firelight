import { type LayoutModule } from 'anafero/index.mjs';
import Component from './Layout.jsx';


const mod: LayoutModule = {
  name: "IEEE basic layout",
  version: "0.0.1",
  layouts: [{
    name: "default",
    layout: {
      Component,
    },
  }],
};

export default mod;
