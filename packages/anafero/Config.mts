import * as S from '@effect/schema/Schema';
//import { Schema as ProseMirrorDocumentSchema } from 'prosemirror-model';
import { type StoreAdapterModule } from './ResourceReader.mjs';
import { type ContentAdapterModule } from './ContentGenerator.mjs';
import { type LayoutModule } from './Layout.mjs';


/**
 * Synchronously obtains a dependency that was pre-loaded.
 */
export type SyncDependencyGetter = <T>(moduleID: string) => T

/**
 * Retrieves and loads a dependency asynchronously.
 */
export type DependencyResolver = <T>(module: string) => Promise<T>;

/** Determines how to handle versions. */
export interface VersionBuildConfig {
  revision: string[];
  currentRevision: string;
  omitRevisionsNewerThanCurrent: boolean;
}


/**
 * Build config (for a particular version), with resolved dependencies.
 *
 * See also BuildConfigSchema.
 */
export interface ResolvedBuildConfig {
  /** The entry point, path to XML of a Metanorma document or collection. */
  entryPoint: string;
  storeAdapters: StoreAdapterModule[];
  contentAdapters: ContentAdapterModule[];
  resourceLayouts: LayoutModule[];
}


/**
 * Build config (for a particular version), as given by the user.
 *
 * See also ResolvedBuildConfig.
 */
export const BuildConfigSchema = S.Struct({

  version: S.Literal('0.1'),

  /** The entry point, path to XML of a Metanorma document or collection. */
  entryPoint: S.String.pipe(S.nonEmptyString()),

  /**
   * Which reader modules to use.
   *
   * URI. Supported protocols: file:, in future git:.
   * Must resolve to an NPM package where index.tsx exports ResourceReaderModule
   * as default.
   */
  storeAdapters: S.NonEmptyArray(S.String.pipe(S.nonEmptyString())),

  /**
   * Which content generator modules to use.
   *
   * URI. Supported protocols: file:, in future git:.
   * Must resolve to an NPM package where index.tsx exports ContentAdapterModule
   * as default.
   */
  contentAdapters: S.NonEmptyArray(S.String.pipe(S.nonEmptyString())),

  /**
   * Eeach item is a URI. Supported protocols: file:, in future git:.
   * Must resolve to an NPM package where index.tsx exports resource layout
   * React FC as default export. It can import `react` and `react-helmet`.
   * The component must support children
   * where actual resource content DOM is included,
   * and can provide surrounding navigation and styling.
   *
   * First layout is the default one.
   */
  resourceLayouts: S.NonEmptyArray(S.String.pipe(S.nonEmptyString())),

  // /**
  //  * Eeach item is a URI. Supported protocols: file:, in future git:.
  //  * Must resolve to an NPM package where index.mts exports ResourceViewer
  //  * as default.
  //  */
  // resourceViewers: S.Array(S.String.pipe(S.nonEmptyString())),

});
export type BuildConfig = S.Schema.Type<typeof BuildConfigSchema>;


// const ProseMirrorDocumentSchemaFromSelf = S.declare(
//   (input: unknown): input is ProseMirrorDocumentSchema =>
//     input instanceof ProseMirrorDocumentSchema,
//   {
//     identifier: "ProseMirrorDocumentSchemaFromSelf",
//     description: "Represents ProseMirror document schema instance.",
//   },
// );
// 
// 
// /**
//  * Defines how resources map to ProseMirror schema and node views.
//  */
// export const ProseMirrorConfigSchema = S.Struct({
// 
//   version: S.Literal('0.1'),
// 
//   /**
//    * Maps source XML element selectors to structural subresource content types.
//    *
//    * Ordering of keys may matter. The first matching selector for an element
//    * will be used as content type.
//    */
//   contentTypeByStructuralSubresourceRootElementCSSSelector: S.Record({
//     /**
//      * A `.matches()` or `.querySelector()`-suitable CSS selector
//      * like `'clause:not([type="toc"])'` or even `'*'`.
//      */
//     key: S.String,
//     /**
//      * Structural subresource content type.
//      * A string like `clause` that will be used to, e.g.,
//      * resolve ProseMirror document schema for structural resource contents.
//      */
//     value: S.String,
//   }),
// 
//   /**
//    * Any node views for structural subresource’s content subresources
//    * (does not apply to the root node of a resource).
//    *
//    * Node IDs for content subresources correspond to those defined
//    * by the schema for that subresource.
//    */
//   nodeViewsByNodeID: S.Record({
//     /**
//      * ProseMirror node ID
//      * (of a node inside structural resource’s content,
//      * covering all structural resource content types).
//      */
//     key: S.String,
//     // The React FC for the node.
//     // Must accept nytimes/react-prosemirror’s NodeViewComponentProps.
//     // Must `forwardRef()`, as per that package’s docs.
//     // We can’t really validate this all too much in the schema.
//     value: ReactProseMirrorNodeViewFromSelf,
//     //value: S.Struct({
//     //}),
//   }),
// 
//   /**
//    * Maps node ID of a structural resource
//    * to a ProseMirror document schema instance.
//    */
//   schemaByStructuralSubresourceContentType: S.Record({
//     /** Content type. */
//     key: S.String,
//     // Should we use schema spec object instead of actual schema?
//     // It may be easier to validate the actual schema, though,
//     // through `instanceof` (presumably).
//     value: ProseMirrorDocumentSchemaFromSelf,
//   }),
// 
// });
// export type ProseMirrorConfig = S.Schema.Type<typeof ProseMirrorConfigSchema>;

// export const ResolvedBuildConfigSchema = S.Struct({
// 
//   /** The entry point, path to XML of a Metanorma document or collection. */
//   entryPoint: S.String.pipe(S.nonEmptyString()),
// 
//   ResourceReader,
// 
//   resourceViewers: S.Array(ResourceViewer),
// 
//   resourceLayouts: S.Array(ResourceLayout),
// 
// });
//export type ResolvedBuildConfig = S.Schema.Type<typeof ResolvedBuildConfigSchema>;
