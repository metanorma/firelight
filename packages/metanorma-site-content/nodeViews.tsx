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
  const elID = nodeProps.node.attrs?.resourceID
    ? encodeURIComponent(nodeProps.node.attrs.resourceID)
    : undefined;
  const maybeClassName = nodeProps.node.attrs?.className;
  const extraProps = maybeClassName
    ? { className: maybeClassName }
    : {};
  return <Tag
      ref={ref}
      id={elID}
      about={nodeProps.node.attrs?.resourceID}
      {...extraProps}>
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

  return <a ref={ref} href={resolvedHref ?? href}>{resourceRepr}</a>;
});


const nodeViews: NodeViews = {
  docMeta: React.forwardRef(function DocMetaNodeView ({ children, nodeProps }, ref) {
    return <div className={classNames.docMeta} ref={ref}>
      {children}
    </div>
  }),
  paragraph: makeResourceNodeView('p'),
  termWithDefinition: makeResourceNodeView('section'),
  figure: makeResourceNodeView('figure'),
  bullet_list: makeResourceNodeView('ul'),
  ordered_list: makeResourceNodeView('ol'),
  resource_link: ResourceLinkView,
};


export default nodeViews;
