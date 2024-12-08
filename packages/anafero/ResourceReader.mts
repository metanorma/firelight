import * as S from '@effect/schema/Schema';


/**
 * Responsible for mapping some entry point to resources and relations.
 */
export interface StoreAdapterModule {
  name: string;
  version: string;

  /**
   * Returns whether it thinks it can obtain resource based on given URI.
   *
   * A blob reader may respond positively to a `file:` URI,
   * which may be encountered while processing relations in another file,
   * and if such a file exists then a blob reader should be constructed
   * from its data blob to resolve further relations.
   *
   * When processing a new resource URI (obtained via a relation),
   * callers should call this before continuing to use this reader.
   * If it returns false, they can try other readers (if any).
   *
   * E.g., a Metanorma reader could rely on
   * a `urn:metanorma:/<clauseid>/<clauseid>` structure
   * (a tree of clauses relative to entry document as the root)
   * and then return `true` if the URI starts with `urn:metanorma:/`.
   */
  canResolve: (resourceURI: string) => boolean;

  /**
   * If reader responds to `file:` URIs, it should be able to construct
   * readers from file content blobs. (It does not need to construct
   * blobs from file paths, the caller does that according to environment.)
   *
   * Given an initial blob, returns relations from an entry point
   * (e.g., a root of some hierarchy)
   * and a BlobReader allowing to retreive further related resources
   * and potentially convert updated relations to a new blob.
   */
  readerFromBlob?:
    (entryPointBlob: Uint8Array, helpers: ReaderHelpers) => Promise<[
      entryPointRelations: ResourceRelation[],
      reader: BlobReader,
    ]>;
  // Note: Blob reader may be unnecessary (cf. `fetchBlob()` with `file:` URI),
  // but for the purpose of making changes it’s useful to have

  /**
   * Returns a reader for an URI that can fetch relations using `fetchBlob()`
   * but cannot modify the source.
   */
  readerFromURI?:
    (entryPointURI: string, helpers: ReaderHelpers) => Promise<[
      entryPointRelations: ResourceRelation[],
      reader: ResourceReader,
    ]>;

  // /**
  //  * Used when resolving relations.
  //  */
  // readerFromURI: (resourceURI: string) => [
  //   entryPoint: ParsedResource,
  //   reader: ResourceReader,
  // ];
}


export interface ResourceReader {

  // TODO: Combine resourceExists and toURL()?
  // Say we return a friendly URL for given resource, or nothing
  // if resource does not exist?

  resourceExists: (resourceURI: string) => boolean;

  /**
   * Can be used to traverse resources.
   * In case of a document, relations can be between a document and a section
   * or a section and its paragraph. In case of a source file, relations
   * represent its AST.
   *
   * Content generators CAN rely on the order of relations emitted
   * by resource readers.
   *
   * A relation’s target URI can be resolved with a different reader
   * (whatever responds to canResolve() and resourceExists()).
   * It can use the `file:` scheme, which means another blob reader
   * would have to be constructed.
   *
   * If recurseUpTo is not specified, recursively resolves relations
   * and it’s up to the caller to stop it. Otherwise, will only resolve
   * up to that many levels.
   */
  resolveRelations: (resourceURI: string, recurseUpTo?: number) =>
    AsyncGenerator<ResourceRelation>;

  resolveRelation: (resourceURI: string, predicate: string, recurseUpTo?: number) =>
    Promise<string[]>;

  //generateResources: ResourceGenerator;

  // /**
  //  * Given some generated resource URI, convert it to a suitable Web URL
  //  * relative to its own root entry point.
  //  * Leading slash, no trailing slash.
  //  */
  // toURL: (resourceURI: string) => string;
};


interface BlobReader extends ResourceReader {
  /**
   * In editable contexts, calling this would provide an updated blob
   * that can be written to filesystem or VCS tree.
   *
   * Any authentication or tracking changes
   * is supposed to be handled by other layers.
   * E.g., in case of Git committer information and message
   * can be handled by a layer that commits blob changes.
   */
  updateRelations?: (
    resourceURI: string,
    relations: ResourceRelation[],
  ) => Promise<Uint8Array>;
}


/**
 * Helpers provided to the reader by the caller,
 * as their implementation may differ across environments.
 */
export interface ReaderHelpers {
  /**
   * For `file:` URIs, callers should take care to resolve them securely.
   */
  fetchBlob: (uri: string) => Promise<Uint8Array>;

  /**
   * JSON decoding is available across environments,
   * but parsing DOM isn’t.
   *
   * This must provide a reasonably compliant document
   * with modern selector support.
   *
   * Supporting this is is heavy (JSDOM), and it’s also available
   * in some environments (like browsers) natively,
   * so we’ll just delegate to this function.
   */
  decodeXML: (blob: Uint8Array) => Document;

  // /**
  //  * Blob resolver may encounter a file split and need to obtain
  //  * another blob to continue.
  //  *
  //  * The given path can be relative to initial entry point
  //  * or potentially later some absolute URL.
  //  */
  // fetchBlob: (objectPath: string) => Promise<Uint8Array>;
}


/**
 * Like an RDF triple, except subject URI is implicit
 * and ordering in which it appears among siblings can be significant.
 */
const ResourceRelationSchema = S.Struct({

  /**
   * Describes the type of relation.
   * Currently, a plain descriptive label.
   * In future may be a URI resolved to relation metadata.
   *
   * An example can be “hasPart”.
   *
   * “hasPart” relation is respected for the purposes of generating
   * a hierarchy of resources.
   */
  predicate: S.String.pipe(S.nonEmptyString()),

  /**
   * Object of the relation.
   * Could be a root-relative slash-prepended path to another resource,
   * or an URI.
   *
   * It could be a `file:` URI if relation points to another local file.
   */
  target: S.String.pipe(S.nonEmptyString()),

  // /**
  //  * A reader can output relations that are not encoded in the source
  //  * but were computed by the adapter. Example: hasNext, seeAlso.
  //  */
  // synthetic: S.Boolean.pipe(S.optional),

});
export type ResourceRelation = S.Schema.Type<typeof ResourceRelationSchema>;




// const ParsedResourceSchema = S.Struct({
//   meta: ResourceMetaSchema,
//   content: ResourceContentSchema.pipe(S.optional),
//   relations: S.Array(ResourceRelationSchema),
// });
// export type ParsedResource = S.Schema.Type<typeof ParsedResourceSchema>;
// 
// 
// 
// 






// type ResourceReadResult = RecursiveParsedResource | ResourceForAnotherReader;
// 
// 
// export interface RecursiveParsedResource {
//   resource: ParsedResource;
//   // /** Generates direct descendants. */
//   // generateChildren: AsyncGenerator<ResourceReadResult>;
// }
// 
// 
// export const ResourceForAnotherReaderSchema = S.Struct({
//   /**
//    * The blob to be given to resolved reader.
//    */
//   blob: S.Uint8Array,
// 
//   /**
//    * Reader module reference.
//    * The module is supposed to resolve to ResourceReaderModule.
//    * Caller is supposed to handle resolution
//    * (caching readers as necessary), note any new schemas
//    * and invoke the new reader with the blob, continuing to generate
//    * RecursiveParsedResources.
//    */
//   readerModuleReference: S.String.pipe(S.nonEmptyString()),
// });
// type ResourceForAnotherReader = S.Schema.Type<typeof ResourceForAnotherReaderSchema>;


// /**
//  * Resource generator is called with a blob and some fetcher
//  * helpers, and should generate RecursiveParsedResources.
//  *
//  * If it is the main entry point of root, outputting multiple
//  * direct subresources will result in an error: the first overall emitted
//  * resource is the root, and there can be only one.
//  *
//  * The order of generated resources matters, navigation is sorted
//  * based on it and users may see previous/next links.
//  *
//  * If it encounters a reference to a resource that is stored
//  * as another physical object referenced by path,
//  * it can `fetchBlob()` and continue.
//  *
//  * If it encounters a subresource which it cannot handle,
//  * but knows another reader module that can handle it,
//  * it should dump resource into a blob and generate a ResourceForAnotherReader
//  * instead of RecursiveParsedResource.
//  */
// type ResourceGenerator = (entryPointBlob: Uint8Array, helpers: ReaderHelpers) =>
//   AsyncGenerator<ResourceReadResult>;
