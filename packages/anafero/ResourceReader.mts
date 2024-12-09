import * as S from '@effect/schema/Schema';
import { type RelationTriple } from './relations.mjs';


type GrowToSize<T, N extends number, A extends T[]> = 
  A['length'] extends N ? A : GrowToSize<T, N, [...A, T]>;


type FixedArray<T, N extends number> = GrowToSize<T, N, []>;


// Old

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

  /** This should be fast. Doesn’t have to be exact. */
  estimateRelationCount: () => number;

  /**
   * Parses all resources & calls specified callback
   * with each relation chunk.
   *
   * Chunk size currently can be any reasonable number.
   */
  discoverAllResources: (
    onRelationChunk: (rel: readonly RelationTriple<any, any>[]) => void,
    opts: { onProgress: (msg: string) => void },
  ) => void;

  ///**
  // * Can be used to traverse resources incrementally.
  // *
  // * In case of a document, relations can be between a document and a section
  // * or a section and its paragraph. In case of a source file, relations
  // * represent its AST.
  // *
  // * Content generators CAN rely on the order of relations emitted
  // * by resource readers.
  // *
  // * A relation’s target URI can be resolved with a different reader
  // * (whatever responds to canResolve() and resourceExists()).
  // * It can use the `file:` scheme, which means another blob reader
  // * would have to be constructed.
  // *
  // * If recurseUpTo is not specified, recursively resolves relations
  // * and it’s up to the caller to stop it. Otherwise, will only resolve
  // * up to that many levels.
  // */
  //resolveRelations: (resourceURI: string, recurseUpTo?: number) =>
  //  AsyncGenerator<ResourceRelation>;

  //resolveRelation: (resourceURI: string, predicate: string, recurseUpTo?: number) =>
  //  Promise<string[]>;

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
  ///**
  // * For `file:` URIs, callers should take care to resolve them securely.
  // */
  //fetchBlob: (uri: string) => Promise<Uint8Array>;

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




// // New
// 
// export abstract class StoreAdapter {
//   static get name(): string;
//   static get version(): string;
// 
//   abstract estimateRelationCount(): Promise<number | undefined>;
// 
//   /**
//    * Returns whether given resourceURI is supported at first look
//    * (e.g., based on filename extension or protocol).
//    */
//   static recognizes(resourceURI: string): boolean {
//     return false;
//   }
// 
//   abstract has(resourceURI: string): boolean;
// 
//   /**
//    * Can fail if store adapter cannot read given resource,
//    * even if it can recognize it (recognizes() returns true).
//    */
//   constructor(private resourceURI: string) {}
// 
//   /**
//    * Processes the entry point to find all relations,
//    * calling the provided callback with each chunk of relations.
//    */
//   abstract discoverRelations
//   (onRelationsDiscovered: (relations: Array<readonly [string, string, string]>) => void):
//   void;
// }
