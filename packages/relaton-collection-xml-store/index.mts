import {
  ROOT_SUBJECT,
  type RelationGraphAsList,
  type StoreAdapterModule,
} from 'anafero/index.mjs';


const mod: StoreAdapterModule = {
  name: "Relaton collection XML store adapter",
  version: '0.0.1',
  canResolve: (path) => path.endsWith('.xml'),
  readerFromBlob: async function (blob, helpers) {
    const dom = helpers.decodeXML(blob);

    if (dom.documentElement.tagName !== 'relaton-collection') {
      throw new Error("Not a valid Relaton collection XML file");
    }

    const title = dom.querySelector('title')!.textContent!;

    const contributors: RelationGraphAsList =
      Array.from(dom.querySelectorAll('contributor')).
      filter(el => !el.closest('bibdata')).
      map(el => [ROOT_SUBJECT, 'hasContributor', el.textContent!]);

    const uriElements = dom.querySelectorAll('bibdata uri[type="xml"]');

    const presentationURIs = Array.from(uriElements).
      map(uri => `file:${uri.textContent!.replace('.xml', '.presentation.xml')}`);
    const documentReferences: RelationGraphAsList =
      presentationURIs.map(uri => [ROOT_SUBJECT, 'hasPart', uri]);

    return [
      [],
      {
        getCanonicalRootURI: () =>
          `urn:metanorma:collection:${encodeURIComponent(title)}`,
        estimateRelationCount: () =>
          contributors.length + documentReferences.length,
        discoverAllResources: (onRelationChunk) => {
          onRelationChunk([
            [ROOT_SUBJECT, 'hasTitle', title],
            [ROOT_SUBJECT, 'type', 'collection'],
            ...contributors,
            ...documentReferences,
          ]);
        },
      },
    ];
  },
};


export default mod;
