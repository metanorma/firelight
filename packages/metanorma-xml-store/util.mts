

// interface Dependencies {
//   xpath?: {
//     evaluate: typeof document.evaluate,
//     result: typeof window.XPathResult,
//   },
// }

async function * generateAssetsForDocument(
  documentDOM: Document,
  parentCollections: CollectionResource[],
  layout: Document,
  readSupportingAssetBlob: (assetPath: string) => Promise<Uint8Array>,
  dependencies?: Dependencies,
) {

  /** Returns DOM element representing a subresource with given ID. */
  function getResourceDOM(resourceID: string): Element {
    const element = documentDOM.getElementById(resourceID);
    if (!element) {
      console.debug("Unable to get element for resource", resourceID);
      throw new Error("Unable to get element for resource");
    }
    return element;
  }

  const highLevelSectioningContainers = Array.from(iterateElements(
    '/*/preface | /*/sections | /*/annex | /*/bibliography',
    documentDOM.documentElement,
  ));

  // const highLevelSectioningContainers = Array.from(documentDOM.querySelectorAll(`
  //   :scope > preface,
  //   :scope > sections,
  //   :scope > annex`));
  // // <annex> can be a container for clause elements.


  // Emit root page

  const children = S.decodeUnknownSync(
    S.NonEmptyArray(StructuralSubresourceSchema)
  )(highLevelSectioningContainers.
    map(getStructuralDescendants).
    flatMap(nodeList =>
      Array.from(nodeList).map(el =>
        getSubresourceWithDirectSubresources(el, getStructuralDescendants)))
  );

  const documentRootResource = {
    type: 'document',
    title: "Firelight document",
    children,
    parents: parentCollections,
  } as const;

  const resources = generateStructuralSubresources(
    highLevelSectioningContainers,
    [documentRootResource, ...parentCollections],
    getStructuralDescendants);

  const rootPageManifest = preparePageManifest(
    documentRootResource,
    '/',
    getNav(documentRootResource, children, parentCollections));

  yield generatePageAssets(
    rootPageManifest,
    layout,
    getResourceDOM,
    readSupportingAssetBlob);


  // Emit other pages

  const pageManifests = generatePageManifests(
    resources,
    '/');

  const blobs = generateAssetsForPages(
    pageManifests,
    layout,
    getResourceDOM,
    readSupportingAssetBlob);

  for await (const blobChunk of blobs) {
    yield blobChunk;
  }
}


function getSubresource(el: Element): StructuralSubresourceExcludingSubresources {
  const id = el.getAttribute('id');
  if (!id || id.trim() === '' || typeof id !== 'string') {
    throw new Error("Subsection has no ID");
  }
  const title = el.firstElementChild?.textContent ?? id;
  return {
    type: 'section',
    id,
    uriFriendlyID:
      unescape(id.replaceAll('___x', '%u').replaceAll('__x', '%u')),
    title,
    // description,
  };
}

function getSubresourceWithDirectSubresources(
  el: Element,
  getDirectStructuralDescendants: (el: Element) => Element[],
): StructuralSubresource {
  const subresource = getSubresource(el);
  return {
    ...subresource,
    children:
      Array.from(getDirectStructuralDescendants(el)).
      map(getSubresource),
  };
}


/**
 * Given resource’s XML DOM element,
 * parses it into a ProseMirror document and returns a tuple of
 * 1) its representation as HTML DOM, and
 * 2) paths of any supporting assets
 * found to be referenced by the resource
 * (and to be resolved, say, through local filesystem).
 *
 * Paths of supporting assets are provisional functionality.
 * It is assumed that they will only be within this subtree,
 * but that may not hold.
 *
 * Those can then be used to build a subtree with page’s static HTML.
 */
export function parseResourceDOM(
  el: Element,
  document: Document,
): [Element, Record<string, true>] {
  // TODO: Different parsers for different resources
  const parser = MetanormaDOMParser.fromSchema(mnClausePresentationSchema);

  const clone = el.cloneNode(true) as Element;

  const structural = getStructuralDescendants(el).map(el => el.getAttribute('id'));

  for (const child of Array.from(clone.children)) {
    if (structural.includes(child.getAttribute('id'))) {
      clone.removeChild(child);
    }
  }

  //console.debug('parsing dom', el.tagName, el.matches);
  const doc = parser.parse(clone);

  // const supportingAssets = {};
  // // TODO: Resolve resource assets
  // //
  // // If this resource is found to reference any supporting assets
  // // (which can be found by their paths, say on local filesystem)
  // // that will expected to be included in the output, we should return
  // // paths to those assets.

  // const serializer = DOMSerializer.fromSchema(mnClausePresentationSchema);
  // const domNode = serializer.serializeNode(doc, { document });

  // if (domNode.nodeType === 1) {
  //   return [domNode as Element, supportingAssets];
  // } else {
  //   throw new Error("ProseMirror content DOM is not an Element; possibly a Node");
  // }
}


export async function * generateAssetsForEntryPoint(
  /** Source XML document’s DOM. */
  entryPoint: Document,
  /** HTML DOM used as layout. */
  documentLayout: Document,
  /**
   * If any resource in the document references some supporting assets
   * that need to be included, this can resolve asset data by its path.
   */
  readSupportingAssetBlob: (assetPath: string) => Promise<Uint8Array>,
  /**
   * When processing a collection, this should obtain a Document
   * for a subcollection or individual document.
   */
  readSubresourceDocument: (documentPath: string) => Promise<Document>,
  dependencies?: Dependencies,
): AsyncGenerator<Record<string, Uint8Array>> {
  console.debug("Generating assets for entry point");

  if (entryPoint.documentElement.tagName === 'collection') {
    throw new Error("Metanorma collections are not supported yet");
    //return generateAssetsForCollection(entryPoint);
  } else {
    yield * generateAssetsForDocument(
      entryPoint,
      [], // No parents, since the document is the entry point.
      documentLayout,
      readSupportingAssetBlob,
    );
  }
}


// function renderSubresourceNav(
//   subresources: Navigation["subresources"],
//   layout: Document,
// ): Element {
//   const elList = layout.createElement('ol');
//   for (const subres of subresources) {
//     const elItem = layout.createElement('li');
//     const elLink = layout.createElement('a');
//     const link = `./${subres.uriFriendlyID}/`;
//     elLink.setAttribute('href', link);
//     elLink.innerHTML = subres.title;
//     elItem.appendChild(elLink);
//     elList.appendChild(elItem);
//   }
//   return elList;
// }


async function generatePageAssets(
  page: StructuralResourcePageManifest,
  /**
   * This document will be cloned to be used as a layout for each page.
   *
   * Must contain an element with ID “resource”, the content of which
   * will be replaced with resource content DOM.
   *
   * Also doubles as document for ProseMirror’s serializer
   * to instantiate DOM nodes.
   */
  layout: Document,
  getResourceDOM: (resourceID: string) => Element,
  readAssetBlob: (resourcePath: string) => Promise<Uint8Array>,
): Promise<Record<string, Uint8Array>> {

  const sourceElementDOM = S.is(RootResourceSchema)(page.resource)
    ? layout.createElement('main') // TODO: Handle cover page contents
    : getResourceDOM(page.resource.id);
  const [htmlContentDOM, supportingAssetPaths] =
    parseResourceDOM(sourceElementDOM, layout);

  const resourceHTML = htmlContentDOM.innerHTML;

  const appHTML = renderToString(Layout({ ...page, resourceHTML }));

  if ((page.resource as any).id === 'toc3') {
    console.debug("Got app HTML", appHTML);
  }
  const helmet = Helmet.renderStatic();

  // We can cast it as Document, apparently it retains document API.
  // const layoutClone = layout.cloneNode(true) as Document;

  // const elResourceContainer = layoutClone.getElementById('content')!;
  // elResourceContainer.innerHTML = htmlContentDOM.outerHTML;

  // const elBreadcrumbs = layoutClone.getElementById('breadcrumbs')!;
  // const elContentNav = layoutClone.getElementById('content-nav')!;
  // const elSubresourceNav = layoutClone.getElementById('subresource-nav')!;
  // elSubresourceNav.innerHTML = renderSubresourceNav(page.nav.subresources, layout).outerHTML;

  // const elActions = layoutClone.getElementById('actions')!;

  // const pageHTML = layoutClone.documentElement.outerHTML;

  const supportingAssetData = (await Promise.all(
    Object.keys(supportingAssetPaths).
    map(async (assetPath) =>
      ({ [assetPath]: await readAssetBlob(assetPath) }))
  )).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  return {
    'index.html': encoder.encode(`
      <!doctype html>
      <html ${helmet.htmlAttributes.toString()}>
        <head>
          <meta charset="utf-8">
          ${helmet.title.toString()}
          ${helmet.meta.toString()}
          ${helmet.link.toString()}
          <link rel="stylesheet" href="/bootstrap.css" />
        </head>
        <body ${helmet.bodyAttributes.toString()}>
          <div id="app">${appHTML}</div>
          <script src="/bootstrap.js"></script>
        </body>
      </html>
    `),
    'page-manifest.json': encoder.encode(JSON.stringify(page)),
    ...supportingAssetData,
  };
}


async function * generateAssetsForPages(
  pages: AsyncGenerator<StructuralResourcePageManifest>,
  /**
   * This document will be cloned to be used as a layout for each page.
   *
   * Must contain an element with ID “resource”, the content of which
   * will be replaced with resource content DOM.
   *
   * Also doubles as document for ProseMirror’s serializer
   * to instantiate DOM nodes.
   */
  layout: Document,
  getResourceDOM: (resourceID: string) => Element,
  readAssetBlob: (resourcePath: string) => Promise<Uint8Array>,
): AsyncGenerator<Record<string, Uint8Array>> {
  for await (const page of pages) {
    const assets = await generatePageAssets(page, layout, getResourceDOM, readAssetBlob);
    // Return page assets prefixed with page path
    yield Object.entries(assets).
      map(([path, data]) => ({ [`${page.fullPath}${path}`]: data })).
      reduce((prev, curr) => ({ ...prev, ...curr }), {});
  }
}

function * generateStructuralSubresources(
  containers: Element[],
  parentChain: StructuralResource[],
  getDirectStructuralDescendants: (el: Element) => Element[],
):
Generator<RecursiveStructuralSubresource> {
  for (const container of containers) {
    console.debug("Generating subresources for a", container.tagName);
    yield * generateSubresourcesRecursively(
      container,
      parentChain,
      getDirectStructuralDescendants);
  }
}

/**
 * A triple of subresource, its navigation,
 * and a generator of further subresources.
 */
type RecursiveStructuralSubresource = [
  StructuralSubresource,
  Navigation,
  Generator<RecursiveStructuralSubresource>,
];


function * generateSubresourcesRecursively(
  el: Element,
  parentChain: StructuralResource[],
  getDirectStructuralDescendants: (el: Element) => Element[],
): Generator<RecursiveStructuralSubresource> {
  for (const subresourceEl of Array.from(getDirectStructuralDescendants(el))) {
    const subres = getSubresourceWithDirectSubresources(
      subresourceEl,
      getDirectStructuralDescendants);
    const nav = getNav(
      subres,
      Array.from(getDirectStructuralDescendants(subresourceEl)).map(getSubresource),
      parentChain);
    yield [
      subres,
      nav,
      generateSubresourcesRecursively(
        subresourceEl,
        [subres, ...parentChain],
        getDirectStructuralDescendants),
    ];
  }
}


// async function * generatePageManifests(
//   sectioningResources: Generator<RecursiveStructuralSubresource>,
//   /** POSIX slash-separated path to current root, with trailing slash. */
//   rootPath: string,
// ): AsyncGenerator<StructuralResourcePageManifest> {
//   for (const [resource, nav, directSubresourceGenerator] of sectioningResources) {
//     yield preparePageManifest(
//       resource,
//       rootPath,
//       nav);
//     yield * generatePageManifests(
//       directSubresourceGenerator,
//       `${rootPath}${resource.uriFriendlyID}/`);
//   }
// }


function getNextSibling(
  resource: StructuralResource,
  parents: StructuralResource[],

  /** Used for recursion, do not pass. */
  prefix: string = '',
): [StructuralSubresourceExcludingSubresources, string] | null {
  const isRoot = S.is(RootResourceSchema)(resource);
  const nextParent = parents[0];
  if (isRoot) {
    return null;
  } else if (nextParent) {
    const nextSiblingIdx = nextParent.children.find(res => res.id === resource.id)
      ? nextParent.children.findIndex(res => res.id === resource.id) + 1
      : undefined;
    const nextSibling = nextSiblingIdx !== undefined
      ? nextParent.children[nextSiblingIdx]
      : undefined;
    if (nextSibling) {
      return [nextSibling, `${prefix}../${nextSibling.uriFriendlyID}`];
    } else if (nextParent.children[0]) {
      return [
        nextParent.children[0],
        `${prefix}../${nextParent.children[0].uriFriendlyID}`,
      ];
    } else {
      return getNextSibling(nextParent, parents.slice(1), `${prefix}../`);
    }
  } else {
    throw new Error("Orphan resource: non-root resource with no parents");
  }
}
function getPreviousSibling(
  resource: StructuralResource,
  parent: StructuralResource,
): StructuralSubresourceExcludingSubresources | null {
  const isRoot = S.is(RootResourceSchema)(resource);
  if (isRoot) {
    return null;
  } else {
    const previousSiblingIdx = parent.children.find(res => res.id === resource.id)
      ? parent.children.findIndex(res => res.id === resource.id) - 1
      : undefined;
    const previousSibling = previousSiblingIdx !== undefined
      ? parent.children[previousSiblingIdx]
      : undefined;
    return previousSibling ?? null;
  }
}

// function getResourcePagePath(
//   resource: StructuralResource,
//   parentChain: StructuralResource[],
// ): [path: string, fullPath: string] {
//   const isRoot = S.is(RootResourceSchema)(resource);
//   const rootPath = parentChain.map(pRes => getResourcePagePath(pRes, parentChain.slice(1))).join('/');
//   return [
//     isRoot
//       ? '/'
//       : `${resource.uriFriendlyID}/`,
//     isRoot
//       ? rootPath
//       : `${rootPath}${resource.uriFriendlyID}/`,
//   ];
// }

function getNav(
  resource: StructuralResource,
  subresources: Readonly<StructuralSubresourceExcludingSubresources[]>,
  /** List of parents, from nearest to the root. */
  parents: StructuralResource[],
): Navigation {
  //console.debug("building nav", JSON.stringify({ resource, subresources, parents}, undefined, 4));
  if (parents.length < 1 && subresources.length < 1) {
    throw new Error("Root resource doesn’t have any subresources");
  }

  // Decode schemas since otherwise TS doesn’t know that
  // parents or subresources below are non-empty arrays.
  // TODO: Build nav in a way that is less likely to throw at runtime.
  if (parents.length > 0) {
    const nextSubresource = subresources[0];
    const next = nextSubresource
      ? [nextSubresource, `./${nextSubresource.uriFriendlyID}`]
      : (getNextSibling(resource, parents) ?? undefined)
    const previousSibling = getPreviousSibling(resource, parents[0]!);
    return S.decodeUnknownSync(SubresourceNavigationSchema)({
      parents,
      subresources,
      next: next
        ? {
            resource: next[0],
            url: next[1],
          }
        : undefined,
      previous: {
        resource: previousSibling ?? parents[0],
        url: previousSibling ? `../${previousSibling.uriFriendlyID}` : '../',
      },
    });
  } else {
    const next = subresources[0]!;
    return S.decodeUnknownSync(RootNavigationSchema)({
      subresources,
      next: {
        resource: next,
        url: next.uriFriendlyID,
      },
    });
  }
}

// function preparePageManifest(
//   resource: StructuralResource,
//   rootPath: string,
//   nav: Navigation,
// ): StructuralResourcePageManifest {
//   const isRoot = S.is(RootResourceSchema)(resource);
//   return {
//     path: isRoot
//       ? '/'
//       : `${resource.uriFriendlyID}/`,
//     fullPath: isRoot
//       ? rootPath
//       : `${rootPath}${resource.uriFriendlyID}/`,
// 
//     nav,
//     resource,
//   };
// }
