import * as S from '@effect/schema/Schema';

import { type Node as ProseMirrorNode } from 'prosemirror-model';
//import { type ResourceRelation } from './ResourceReader.mjs';
import { type RelationTriple } from './relations.mjs';


export interface LayoutProps {

  className?: string | undefined;

  /**
   * A PM node with only basic inline markup, no blocks.
   */
  resourceTitle: string | ProseMirrorNode;

  /**
   * Relations that did not contribute to content.
   */
  relations: RelationTriple<string, string>[];

  /**
   * Navigation around the resource is more strictly part of hierarchy,
   * not relations.
   */
  nav: ResourceNav;

  // TODO: Resolve locateResource & similar helpers/hooks from context

  /**
   * Must return resource’s URL/path given its URI/ID.
   */
  locateResource: (uri: string) => string;

  // Sync only.
  //resolveGraph: (uri: string) => RelationGraphAsList;

  ResourceLink: React.FC<{
    uri: string;
    getPlainTitle?: (title: string) => string;
  }>;

}

/**
 * A layout receives resource title & relations and can render
 * some surrounding elements. It also receives children representing
 * resource contents, managed by the parent.
 */
export type LayoutFC =
  React.ForwardRefExoticComponent<React.PropsWithChildren<LayoutProps>
  & React.RefAttributes<any>>;


export const NavLinkSchema = S.Struct({
  path: S.String,
  plainTitle: S.String,
});
export type NavLink = S.Schema.Type<typeof NavLinkSchema>;
export const ResourceNavSchema = S.Struct({
  /** Chain of parent resources, from nearest all the way to the top. */
  breadcrumbs: S.Array(NavLinkSchema),
  children: S.Array(NavLinkSchema),
  /** Next resource’s URI. */
  next: S.String.pipe(S.nonEmptyString(), S.optional),
  /** Previous resource’s URI. */
  previous: S.String.pipe(S.nonEmptyString(), S.optional),
});
export type ResourceNav = S.Schema.Type<typeof ResourceNavSchema>;

//export interface Nav {
//  breadcrumbs: NavLink[];
//  children: NavLink[];
//}
//
//export interface NavLink {
//  /** Full path. */
//  path: string;
//
//  plainTitle: string;
//}


export interface Layout {
  Component: LayoutFC;

  /**
   * Style rules, as a string, to be applied to resource’s content HTML.
   * Rules will be scoped (duplicated) for each resource,
   * even if multiple resources are displayed per page.
   *
   * Note: should be treated as optional.
   * Currently, for style to have effect requires:
   * 1) Deployments to relax CSP and specify `style-src: 'unsafe-inline'`,
   *    allowing inline styling. This should not be done on pages
   *    with any potentially untrusted UGC. Without CSP relaxation,
   *    these styling rules will not have effect.
   * 2) JavaScript support.
   */
  contentHTMLStyle?: string;
}


export interface LayoutModule {

  name: string;
  version: string;

  layouts: { name: string, layout: Layout }[];

}
