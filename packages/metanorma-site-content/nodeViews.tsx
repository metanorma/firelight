import React from 'react';
import { type NodeViews } from 'anafero/index.mjs';
import { ResourceNavigationContext } from 'anafero/index.mjs';
import * as classNames from './style.css';


const makeResourceNodeView:
(Tag: 'section' | 'p' | 'div' | 'figure' | 'ul' | 'ol') => NodeViews[string] =
(Tag) => React.forwardRef(function NodeViewMaybeRepresentingResource ({
  children,
  nodeProps,
}, ref) {
  const navCtx = React.useContext(ResourceNavigationContext);

  const elID = nodeProps.node.attrs?.resourceID
    ? encodeURIComponent(nodeProps.node.attrs.resourceID)
    : undefined;

  const resourceID = nodeProps.node.attrs?.resourceID;

  const maybeClassName: string = nodeProps.node.attrs?.className ?? '';

  const isActive: boolean | undefined =
    resourceID && navCtx.requestedResourceURI
      ? navCtx.requestedResourceURI === resourceID
      : undefined;

  const maybeActiveSubresourceClassName: string =
    isActive === true
      ? classNames.activeSubresource
      : '';

  const effectiveClassName = `
    ${maybeClassName}
    ${maybeActiveSubresourceClassName}
  `;

  // NB: Using focusVisible can supersede both assigning a className
  // and the necessity to scrollIntoView for the active resource:
  //
  //     const maybeActive: boolean | undefined =
  //       resourceID && navCtx.requestedResourceURI
  //         ? navCtx.requestedResourceURI === resourceID
  //         : undefined;
  //     const [elRef, setEl] = React.useState<HTMLElement | null>(null);
  //     const elRefSetter = React.useCallback(
  //       (el: HTMLElement | null) => setEl(el ?? null),
  //       []);
  //     React.useImperativeHandle(ref, () => elRef, [elRef]);
  //     React.useEffect(() => {
  //       if (maybeActive && elRef) {
  //         (elRef.focus as any)({ focusVisible: true });
  //       }
  //       return;
  //     }, [maybeActive, elRef]);
  //
  // However, it doesn’t work as expected
  // with random non-input/non-link elements.
  //
  // It might be possible to make it work by inserting an anchor child
  // and focusing THAT instead (and styling parent by way of ::focus-within),
  // but that has not been tried yet.
  //
  // (Extra element can interfere with editing mode?)

  return <Tag
      ref={ref}
      id={elID}
      about={resourceID}
      className={effectiveClassName}>
    {children}
  </Tag>;
});


const ResourceLinkView: NodeViews[string] = React.forwardRef(function ResourceLinkView ({
  children,
  nodeProps,
}, ref) {
  const navCtx = React.useContext(ResourceNavigationContext);
  const href = nodeProps.node.attrs?.href;
  let resolvedHref: string | null;
  if (href.startsWith('http') || href.startsWith('data:')) {
    console.warn("ResourceLinkView expects PM node’s href attribute to be a resource URI, but got", href);
    resolvedHref = null;
  } else {
    try {
      resolvedHref = navCtx.locateResource(href);
    } catch (e) {
      console.warn("ResourceLinkView failed to locate resource", href);
      resolvedHref = null;
    }
  }

  // If children is empty (?), generate resource repr by resolving its title
  const [resourceRepr, setResourceRepr] = React.useState(children);
  React.useEffect(() => {
    if (!children && resolvedHref) {
      const abortController = new AbortController();
      (async () => {
        try {
          const title =
            await navCtx.resolvePlainTitle(resolvedHref, abortController.signal);
          if (title) {
            setResourceRepr(<>{title}</>);
          }
        } catch (e) {
          console.error("Failed to resolve plain title", e);
        }
      })();
      return function cleanup() {
        abortController.abort();
      };
    }
    return;
  }, [resolvedHref, children]);

  return <a
    ref={ref}
    href={resolvedHref ?? href}
    download={nodeProps.node.attrs?.download ?? undefined}
  >{resourceRepr}</a>;
});


const nodeViews: NodeViews = {
  meta: React.forwardRef(function DocMetaNodeView ({ children, nodeProps }, ref) {
    return <div className={classNames.metaBlock} ref={ref}>
      {children}
    </div>
  }),
  paragraph: makeResourceNodeView('p'),
  // TODO: Somehow enabling this causes rendering issues when client-side PM is initialized
  //admonition: makeResourceNodeView('aside'),
  //footnote: makeResourceNodeView('aside'),
  termWithDefinition: makeResourceNodeView('section'),
  figure: makeResourceNodeView('figure'),
  bullet_list: makeResourceNodeView('ul'),
  ordered_list: makeResourceNodeView('ol'),
  resource_link: ResourceLinkView,
  meta_link: ResourceLinkView,
};


export default nodeViews;
