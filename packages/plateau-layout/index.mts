import { type LayoutModule } from 'anafero/index.mjs';
import Component from './Layout.jsx';


const mod: LayoutModule = {
  name: "Plateau basic layout",
  version: "0.0.1",
  layouts: [{
    name: "default",
    layout: {
      Component,
    },
  }],
};

export default mod;
