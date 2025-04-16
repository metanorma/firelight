import {
  ROOT_SUBJECT,
  type RelationGraphAsList,
  type RelationTriple,
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

    const docBibdata =
      Array.from(dom.querySelectorAll('relation[type="partOf"] bibdata'));

    const presentationXMLURIs = docBibdata.
    map(el => el.querySelector('uri[type="xml"]')).
    filter(uriEl => !!uriEl).
    map(el => `file:${el.textContent!.replace('.xml', '.presentation.xml')}`);

    const documentReferences: RelationGraphAsList =
      presentationXMLURIs.map(uri => [ROOT_SUBJECT, 'hasPart', uri]);

    const alternativeDeliverableReferences: RelationGraphAsList =
      docBibdata.
      flatMap((el, idx) => {
        const primaryDocid =
          el.querySelector('docidentifier[primary="true"]')?.textContent;

        if (primaryDocid) {
          const docURI = `urn:metanorma:doc:${encodeURIComponent(primaryDocid)}`;
          const uris = Array.from(el.querySelectorAll('uri')).
          // TODO: Try a negating selector instead?
          filter(uriEl => uriEl.getAttribute('type') === 'pdf').
          map(uriEl => uriEl.textContent).
          filter(uri => !!uri);
          return uris.map(uri =>
            [docURI, 'hasAlternative', `file:${uri}`] as RelationTriple<any, any>
          );
        } else {
          console.warn("Bibdata is missing primary docid for document at index:", idx);
          return [];
        }
      });

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
            ...alternativeDeliverableReferences,
          ]);
        },
      },
    ];
  },
};


export default mod;
