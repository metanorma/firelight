import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet';
import { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';

import {
  ProseMirror,
  ProseMirrorDoc,
  reactKeys,
} from '@nytimes/react-prosemirror';

import { type SyncDependencyGetter } from 'anafero/Config.mjs';
import {
  type RelationGraphAsList,
  type RelationTriple,
} from 'anafero/relations.mjs';
import {
  type ResourceMetadata,
  type AdapterGeneratedResourceContent,
  type ContentAdapterModule,
  gatherDescribedResourcesFromJsonifiedProseMirrorNode,
} from 'anafero/ContentAdapter.mjs';
import { type Layout, type ResourceNav } from 'anafero/Layout.mjs';
import { ResourceNavigationContext } from 'anafero/ResourceNavigationContext.mjs';

import { ResourceBreadcrumbs } from './ResourceBreadcrumbs.jsx';
import classNames from './style.module.css';


export interface ResourceData {
  graph: Readonly<RelationGraphAsList>;
  content: AdapterGeneratedResourceContent;
  nav: ResourceNav;
}


export const ResourceHelmet: React.FC<ResourceMetadata> = function (props) {
  return <Helmet>
    {props.primaryLanguageID ? <html lang={props.primaryLanguageID} /> : null}
    <title>{props.labelInPlainText}</title>
  </Helmet>;
}


export interface ResourceProps extends ResourceData {
  ref?: (element: HTMLDivElement) => void;
  'aria-selected'?: boolean;
  className?: string;
  useDependency: SyncDependencyGetter;
  locateResource: (uri: string) => string;
  reverseResource: (resourcePath: string) => string;
  getResourcePlainTitle: (uri: string) => string;
  selectedLayout: { name: string, layout: Layout };
  uri: string;
  //content: AdapterGeneratedResourceContent;
  document: Document,
  onIntegrityViolation: (rel: RelationTriple<string, string>, msg: string) => void;
}


const reactKeysPlugin = reactKeys();


/**
 * Renders a single resource view.
 */
export const Resource = React.forwardRef(function ({
  className,
  useDependency, locateResource, document,
  getResourcePlainTitle: resolvePlainTitle,
  selectedLayout: layout,
  graph, nav: resourceNav, content,
  'aria-selected': ariaSelected,
}: ResourceProps, ref: React.Ref<HTMLDivElement>) {

  //const resourcePath = locateResource(resourceURI);
  const adapter = useDependency<ContentAdapterModule | undefined>(content.adapterID);

  const schema = useProseMirrorSchema(
    content.content?.contentSchemaID ?? '',
    adapter);

  const preRenderedHTML = useMemo(() => {
    const preRenderingContent = content.content;
    let doc: ProseMirrorNode | undefined;
    try {
      doc = schema && preRenderingContent?.contentDoc
        ? ProseMirrorNode.fromJSON(schema, preRenderingContent.contentDoc)
        : undefined;
    } catch (e) {
      console.error("Failed to generate PM node", preRenderingContent?.contentDoc);
      doc = undefined;
    }
    const domSerializer = doc && schema
      ? DOMSerializer.fromSchema(schema)
      : undefined;

    if (doc && domSerializer) {
      let domNode: Node;
      try {
        domNode = domSerializer.serializeNode(doc, { document });
      } catch (e) {
        console.error("Failed to generate a DOM node from PM", JSON.stringify(preRenderingContent?.contentDoc, null, 4), graph, e);
        throw e;
      }
      if (!domNode) {
        console.error("Got null domNode from PM DOM serializer", domNode, doc);
        throw new Error("Got null DOM node from PM DOM serializer");
      }
      if (domNode.nodeType === 1) {
        const domEl = domNode as Element;
        processGeneratedDOM(domEl, locateResource, () => '', (msg) => console.warn(msg));
        return domEl.innerHTML;
      } else {
        console.warn("ProseMirror content DOM is not an Element; possibly a Node", domNode);
        return undefined;
      }
    } else {
      return undefined;
    }
  }, [schema]);

  const adapterGeneratedContent: AdapterGeneratedResourceContent | undefined =
  useMemo(() => {
    //console.debug("Rendering content");
    if (!adapter) {
      console.debug("Won’t render content (need to know adapter)");
      return undefined;
    }
    return {
      adapterID: content.adapterID,
      content: adapter.generateContent(graph),
    };
  }, [graph, adapter, locateResource]);

  // Editor state only has effect for fetched (not pre-rendered) content
  const initialState = useMemo(() =>
    content.content?.contentDoc && schema
      ? EditorState.create({
          schema,
          doc: ProseMirrorNode.fromJSON(schema, content.content.contentDoc),
          plugins: [reactKeysPlugin],
        })
      : undefined,
    [schema, adapterGeneratedContent]);

  const somethingStillLoading = [adapter, initialState].includes(undefined);

  const Layout = layout.layout.Component;

  const [contentElement, setContentElement] = useState<HTMLElement | null>(null);
  const [layoutElement, setLayoutElement] = useState<HTMLElement | null>(null);
  const [visibleResourceLinks, setVisibleResourceLinks] =
    useState<Record<string, [x: number, y: number, url: string]>>({});

  /** IDs of resources described on the page, sorted. */
  const describedResources = useMemo(() => {
    if (content.content?.contentDoc) {
      const resources = Array.from(
        gatherDescribedResourcesFromJsonifiedProseMirrorNode(content.content.contentDoc)
      );
      resources.sort();
      return resources;
    } else {
      return [];
    }
  }, [content.content?.contentDoc]);

  const contentRef = useCallback((el: HTMLDivElement) =>
    setContentElement(el ?? null)
  , []);

  const layoutRef = useCallback((el: HTMLDivElement) =>
    setLayoutElement(el ?? null)
  , []);

  useEffect(() => {
    let timeout: ReturnType<typeof window.setTimeout> | number | undefined = undefined;
    function handleMaybeSubresourceHover(evt: Event) {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const mEvt = evt as MouseEvent;
        const hoveredElement = mEvt.target as HTMLElement | null;
        const el = hoveredElement?.closest('[about]');
        if (el && describedResources.includes(el.getAttribute('about')!)) {
          const bbox = el.getBoundingClientRect();
          if (bbox.y >= 0 && bbox.x >= 0) {
            setVisibleResourceLinks({
              [el.getAttribute('id')!]: [
                bbox.x + window.scrollX - 30,
                bbox.y + window.scrollY,
                locateResource(el.getAttribute('about')!),
              ] as [number, number, string],
            })
          } else {
            setVisibleResourceLinks({});
          }
        } else {
          setVisibleResourceLinks({});
        }
      }, 500);
    }
    contentElement?.addEventListener('mouseover', handleMaybeSubresourceHover);
    return function cleanUp() {
      window.clearTimeout(timeout);
      contentElement?.removeEventListener('mouseover', handleMaybeSubresourceHover);
    }
  }, [layoutElement, contentElement, describedResources]);

  const mainView = somethingStillLoading || typeof window?.document?.createElement === 'undefined'
    ? preRenderedHTML !== undefined
      ? <article
          id="content"
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: preRenderedHTML }}
        />
      : <>…</>
    : <ResourceNavigationContext.Provider value={{ locateResource, resolvePlainTitle }}>
        <ProseMirror
            defaultState={initialState!}
            editable={() => false}
            nodeViews={adapter!.resourceContentProseMirrorOptions.nodeViews}>
          <ProseMirrorDoc ref={contentRef} as={<article />} />
        </ProseMirror>
      </ResourceNavigationContext.Provider>;

  return (
    <div
        ref={ref}
        className={`${classNames.resource} ${className ?? ''}`}
        aria-selected={ariaSelected}>

      <ResourceBreadcrumbs parents={resourceNav.breadcrumbs} />

      {content.content
        ? <ResourceHelmet {...content.content} />
        : null}

      <Layout
          ref={layoutRef}
          ResourceLink={() => ''}
          nav={resourceNav}
          locateResource={locateResource}
          resourceTitle={''}>
        {mainView}
      </Layout>

      {Object.entries(visibleResourceLinks).map(([elID, [left, top, url]]) =>
        createPortal(
          <div
              className={classNames.floatingSubresourceLink}
              style={{ position: 'absolute', top, left }}>
            <a className={classNames.floatingSubresourceLinkAnchor} href={url}>¶</a>
          </div>,
          document.body,
        )
      )}
    </div>
  );
});



// /** Returns relations classified by whether each contributes to content. */
// function useCategorizedRelations(
//   relations: readonly RelationTriple<string, string>[],
//   adapter: ContentAdapterModule | undefined,
// ): { content: RelationTriple<string, string>[]; nonContent: RelationTriple<string, string>[] } {
//   return useMemo(() => {
//     if (relations.length < 1 || !adapter) {
//       return { content: [], nonContent: [] };
//     }
//     return relations.map(([subj, predicate, target]) => [
//       [subj, predicate, target] as RelationTriple<string, string>,
//       adapter.contributesToContent(
//         { predicate, target },
//         relations.filter(([s, ]) => s === target)
//       ),
//     ] as const).reduce((accumulator, [rel, isContent]) => ({
//       content: isContent ? [...accumulator.content, rel] : accumulator.content,
//       nonContent: !isContent ? [...accumulator.nonContent, rel] : accumulator.nonContent,
//     }), {
//       content: [] as RelationTriple<string, string>[],
//       nonContent: [] as RelationTriple<string, string>[],
//     });
//   }, [adapter, relations]);
// }


function useProseMirrorSchema(schemaID: string, adapter: ContentAdapterModule | undefined) {
  return useMemo(() => {
    if (!adapter) {
      return undefined;
    }
    return schemaID
      ? adapter.resourceContentProseMirrorSchema[schemaID]
      : undefined;
  }, [schemaID, adapter]);
}


/**
 * Processes DOM generated from a resource. Resolves references
 * (mutating the DOM!) and reports integrity violations.
 */
function processGeneratedDOM(
  //resourceURI: string,
  el: Element,
  locateResource: (uri: string) => string,
  reverseResource: (path: string) => string,
  onIntegrityViolation: (msg: string) => void,
) {
  processAttributes(el, locateResource, reverseResource, onIntegrityViolation);
  for (const childEl of Array.from(el.children)) {
    processGeneratedDOM(childEl, locateResource, reverseResource, onIntegrityViolation);
  }
}

function processAttributes(
  //resourceURI: string,
  el: Element,
  locateResource: (uri: string) => string,
  reverseResource: (path: string) => string,
  onIntegrityViolation: (msg: string) => void,
) {
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'about') {
      const preexistingID = el.getAttribute('id');
      const inferredID = attr.value;
      //const inferredID = encodeURIComponent(attr.value);
      if (preexistingID && preexistingID !== inferredID) {
        onIntegrityViolation(`Element’s pre-existing ID “${preexistingID}” was changed to match resource ID, to facilitate navigation`);
      }
      el.setAttribute('id', inferredID);
    } else if (['href', 'src'].includes(attr.name)) {
      const isHTTPHref = attr.name === 'href' && attr.value.startsWith('http');
      const isDataSrc = attr.name === 'src' && attr.value.startsWith('data:');

      if (!isHTTPHref && !isDataSrc) {
        let resolvedResourcePath: string | null;
        try {
          resolvedResourcePath = locateResource(attr.value);
        } catch (e) {
          onIntegrityViolation(`Attribute ${attr.name} is neither an external link nor points to a resolvable resource: ${attr.value}`);
          resolvedResourcePath = null;
        }
        if (resolvedResourcePath) {
          // TODO: Check that this works in versions
          el.setAttribute(attr.name, resolvedResourcePath);
        }
      }
    }
  }
}
