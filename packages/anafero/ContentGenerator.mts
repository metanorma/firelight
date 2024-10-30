import * as S from '@effect/schema/Schema';
//import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Schema as ProseMirrorDocumentSchema } from 'prosemirror-model';
import { type NodeViewComponentProps } from '@nytimes/react-prosemirror';

import { type ResourceRelation } from './ResourceReader.mjs';
import { type RelationTriple, type RelationGraphAsList } from './relations.mjs';


export type ReactProseMirrorNodeView =
  React.ForwardRefExoticComponent<NodeViewComponentProps & React.RefAttributes<any>>;


export interface NodeViews {
  [proseMirrorNodeID: string]: ReactProseMirrorNodeView;
}


export const ResourceMetadataSchema = S.mutable(S.Struct({
  // TODO: rich ProseMirror labels?
  labelInPlainText: S.String.pipe(S.nonEmptyString()),
  // TODO: proper schema for ISO language IDs
  primaryLanguageID: S.String.pipe(S.optional),
}));
export type ResourceMetadata = S.Schema.Type<typeof ResourceMetadataSchema>;


/**
 * Walks generated ProseMirror content hierarchy (after `.toJSON()`)
 * and returns a set of strings
 * representing IDs of any resource described by the content
 * (through `resourceID` node attribute).
 */
export function gatherDescribedResourcesFromJsonifiedProseMirrorNode(
  jsonifiedNode: any,
  _accum?: Set<string>,
): Set<string> {
  const accumulator = _accum ?? new Set();
  const maybeResourceID = jsonifiedNode?.attrs?.resourceID;
  if (typeof maybeResourceID === 'string'
      && maybeResourceID.trim() !== ''
      && !accumulator.has(maybeResourceID)) {
    accumulator.add(maybeResourceID);
  }
  if (Array.isArray(jsonifiedNode?.content) && jsonifiedNode.content.length > 0) {
    for (const child of jsonifiedNode.content) {
      gatherDescribedResourcesFromJsonifiedProseMirrorNode(child, accumulator);
    }
  }
  return accumulator;
}


/** 
 * For i18n libraries like Spectrum’s
 * that expect a full locale, this makes some… assumptions
 * to make it have “lang-script” complete (e.g., en => en-GB).
 */
export function fillInLocale(langID: string) {
  if (langID.indexOf('-') >= 1) {
    // Assume script is included
    return langID;
  } else if (DEFAULT_LOCALE[langID as keyof typeof DEFAULT_LOCALE]) {
    return DEFAULT_LOCALE[langID as keyof typeof DEFAULT_LOCALE];
  } else {
    return langID;
  }
}
const DEFAULT_LOCALE = {
  ar: 'ar-AE',
  bg: 'bg-BG',
  cs: 'cs-CZ',
  da: 'da-DK',
  de: 'de-DE',
  el: 'el-GR',
  en: 'en-US',
  es: 'es-ES',
  et: 'et-EE',
  fi: 'fi-FI',
  fr: 'fr-FR',
  he: 'he-IL',
  hr: 'hr-HR',
  hu: 'hu-HU',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  lt: 'lt-LT',
  lv: 'lv-LV',
  nb: 'nb-NO',
  nl: 'nl-NL',
  pl: 'pl-PL',
  pt: 'pt-BR',
  // @ts-ignore-error
  pt: 'pt-PT',
  ro: 'ro-RO',
  ru: 'ru-RU',
  sk: 'sk-SK',
  sl: 'sl-SI',
  sr: 'sr-SP',
  sv: 'sv-SE',
  tr: 'tr-TR',
  uk: 'uk-UA',
  zh: 'zh-CN',
  // @ts-ignore-error
  zh: 'zh-TW',
} as const;


/**
 * Content generator is responsible for transforming resource relations
 * into an hierarchy of formatted website pages.
 */
export interface ContentAdapterModule {
  name: string;
  version: string;

  // TODO: Support creating hierarchy when editing
  // - An API to generate a blank page with all requisite relations?
  // - or just leverage contentToRelations()? probably is enough
  //
  // - API to check for preconditions? or differentiating an entry/root page
  // that can be created directly from another content generator

  /**
   * A list of relation specs that contribute to hierarchy.
   * See contributesToHierarchy(), except these chains are relative to
   * object being considered itself, not given relation target.
   */
  contributingToHierarchy?: string[][];

  /**
   * Should describe any resource, even if it does not contribute to hierarchy.
   */
  describe: (relations: RelationGraphAsList | Readonly<RelationGraphAsList>) => ResourceMetadata;


  // TODO: WIP: Unify hierarchy API, umbrella for conditions + schema + transforms
  // between relations & PM node?
  pages?: {
    /**
     * A list of relation specs to get a path fragment for this page.
     * If a spec is satisfied, then resolved value is used as path fragment.
     * Chains are interpreted relative to subject being considered
     * (if the first item is 'hasPart' then current subject must have hasPart).
     */
    pathFragmentFrom: string[][];

    // id: string?
    // schemaId: string?

    schema: ProseMirrorDocumentSchema;

    generateContent: RelationsToContent;

  }[];


  /**
   * This determines what constitutes hierarchy and what constitutes content.
   *
   * If this returns a string, the related resource
   * should not be treated as part of the subject
   * but to be rendered under that subpath of subject.
   *
   * It can alternatively return an array of relation paths,
   * where each relation path is an array ['predicate1', 'predicate2', ...].
   * Those paths will be checked in order.
   *
   * E.g., for a document and subject X,
   * “hasPart someParagraph” would return null,
   * but “hasPart someSection” could return “hasSequenceNumber”
   * and if “someSection hasSequenceNumber "2"”
   * then site will acquire a path …/X/2.
   * However, “seeAlso someSection” would return null.
   *
   * If a relation does not contribute to hierarchy, then it is
   * considered part of implied resource’s content (machine-readable data
   * and page). If such relation target is an URI, its relations should be
   * resolved recursively, until relation whose target is in hierarchy
   * (that target’s relations should not be further resolved).
   * E.g., “X hasPart fig” resolves fig’s relations,
   * “fig hasPart someCaption” resolves someCaptions’s relations,
   * “someCaption hasPart someLink” resolves someLink’s relations,
   * but “someLink seeAlso Y” would not obtain further relations
   * since Y is already in the hierarchy through other means.
   *
   * If subject’s relation does not contribute to hierarchy,
   * then none of related object’s further relations should contribute
   * to hierarchy, obviously.
   *
   * To avoid circularity, two passes are required:
   * 1. Collect all relations that contribute to hierarchy and skip others.
   * 2. For all resources of the hierarchy, collect relations stopping when
   *    a reference is to a resource in hierarchy (or cannot be resolved).
   *
   * // resolve Y’s relations but not further
   * // because Y is in the hierarchy. This way, content can format
   */
  contributesToHierarchy?: (
    relation: ResourceRelation,
    targetRelations: RelationGraphAsList,
  ) => null | string | string[][];

  /**
   * Since readers can emit relations that contribute neither to hierarchy
   * nor to content, and we want to track which relations are being
   * displayed as content (especially if they are being edited),
   * this should return `false` for non-content contributing relations.
   *
   * Example non-content relations: inferred ones like any hasNext
   * predicates, or inferred seeAlso relations.
   *
   * Shouldn’t be called with any relations that contribute to hierarchy.
   */
  contributesToContent: (
    relation: ResourceRelation,
    targetRelations: RelationGraphAsList,
  ) => boolean;

  // /**
  //  * While resolving resource content, any relation
  //  * not contributing to hierarchy is considered
  //  */
  // contributesItsRelationsToContent: (predicate: string) => boolean;

  /**
   * Obtain a nice(r) representation of content from resource’s relations
   * that do not contribute to hierarchy.
   *
   * The representation must be full-fidelity/exhaustive
   * to facilitate lossless round-trip transformation
   * between generateContent <-> generateRelations.
   *
   * If a resource has any relations that do not contribute to site hierarchy,
   * some content should be generated from them.
   */
  generateContent: RelationsToContent;

  /**
   * Obtain resource relations from resource content representation.
   *
   * Strictly speaking, this is necessary only if changes are made
   * to the source through editing resource content representation.
   *
   * Relations should appear in the same order.
   *
   * Note: If some of returned relations contribute to hierarchy,
   * that may not be handled.
   */
  generateRelations?: ContentToRelations;

  /**
   * ProseMirror schemas used by resources generated from the reader.
   * Schema ID is referenced in generated content.
   *
   * Nodes defined by the schema can define special attributes:
   *
   * - representsRelation: should contain a JSON-serialized RelationTriple
   *   denoting the relation represented by this node.
   *
   * - representsResource: should contain a string with this resource ID/URI.
   *   A processing step would ensure the HTML element has ID attribute set
   *   and allow linking to this part of the page by resource URI from elsewhere
   *
   * - linksToResource: should contain a string with another resource ID/URI;
   *   the node also must define a href attribute. A processing step would
   *   resolve the linked resource ID and overwrite the href attribute
   *   with appropriate relative URL (with appropriate version prefix).
   *
   * - linksToSubresource: like linksToResource, except the linked resource
   *   will be expected to be in the hierarchy beneath the current one.
   *   (Provisional)
   *
   * The DOM nodes obtained from serializing the ProseMirror node via toDOM()
   * MUST use RDFa attribute `about` when an element describes a subresource
   * (something represented by page’s main subject *and* among the subjects
   * described by the page).
   * The `about` is relied on to auto-generate ID attributes and ensure
   * reference integrity.
   *
   * Another potentially respected RDFa attribute is `property`.
   * Currently ignored: resource, rel, rev.
   *
   * Non-RDFa-specific attributes that are processed: `href` and `src`.
   * If they are found to contain an ID of another resource,
   * they are resolved to resource’s path.
   */
  resourceContentProseMirrorSchema: {
    [schemaID: string]: ProseMirrorDocumentSchema;
  };

  resourceContentProseMirrorOptions: {
    /**
     * ProseMirror node views for nodes that may occur
     * in resource content generated by this adapter.
     *
     * Each node should ideally look OK when statically server-rendered.
     */
    nodeViews: NodeViews;

    // TODO: Allow plugins?
  };

  // /**
  //  * Resource reader may specify type of a resource using “type” relation.
  //  * This specifies which resource types are recognized by content generator
  //  * for the purposes of site hierarchy or formatting resource’s content.
  //  */
  // recognizedRelations: {
  //   [predicate: string]: {
  //     /**
  //      * Used to construct the schema.
  //      * For non-hierarchical relations, `${predicate}${targetType}`
  //      * will be the name of the mark or node type in the schema.
  //      */
  //     [targetResourceType: string]: MarkSpec | NodeSpec | 'hierarchy';
  //   };
  //   //content: ResourceRelationSpec;
  //   //hierarchy: ResourceRelationSpec;
  // };

}


/**
 * Given a resource and its pre-resolved relations,
 * generates a content representation of a group of resources
 * starting from given resource URI.
 */
export type RelationsToContent = (
  //resourceURI: string,
  relations: Readonly<RelationTriple<string, string>[]>,

  helpers: {
    domStub: Document;
  },

  // TODO: Support retrieving a title for another resource?
  // That would require making the whole generation async, however.
  // /**
  //  * Allows to obtain a plain title representing another resource.
  //  */
  // getPlainTitle: (resourceURI: string) => Promise<string | null>,
) => ResourceContent | null;


/**
 * Given resource contents, generates relations.
 */
type ContentToRelations = (
  //resourceURI: string,
  content: ResourceContent,
) => RelationTriple<string, string>[];


//const ProseMirrorNodeFromSelf = S.declare(
//  (input: unknown): input is ProseMirrorNode =>
//    input instanceof ProseMirrorNode,
//  {
//    identifier: "ProseMirrorNodeFromSelf",
//    description: "Represents ProseMirror node instance.",
//  },
//);


export const ResourceContentSchema = S.Struct({
  //plainTitle: S.String.pipe(S.nonEmptyString()),

  /**
   * A PM node with only basic inline markup, no blocks.
   * JSON-serializable shape (after toJSON()).
   */
  title: S.Any,

  /** Resource content node in JSON-serializable shape (after toJSON()). */
  contentDoc: S.Any,

  // /**
  //  * A PM node with only basic inline markup, no blocks.
  //  */
  // title: ProseMirrorNodeFromSelf,

  // /** Resource content node. */
  // contentDoc: ProseMirrorNodeFromSelf,

  /**
   * Schema that can be used to work with this resource’s content nodes.
   *
   * The schema should probably be registered by resource reader module
   * that generated this resource.
   */
  contentSchemaID: S.String.pipe(S.nonEmptyString()),
}).pipe(S.extend(ResourceMetadataSchema));
export type ResourceContent = S.Schema.Type<typeof ResourceContentSchema>;

// /**
//  * Same as ResourceContentSchema, but with title & contentDoc
//  * being not Node instances but JSON-serializable structures.
//  */
// export const SerializableResourceContentSchema = S.extend(ResourceContentSchema, S.Struct({
//   /**
//    * A PM node with only basic inline markup, no blocks.
//    * JSON-serializable shape (after toJSON()).
//    */
//   title: S.Any,
// 
//   /** Resource content node in JSON-serializable shape (after toJSON()). */
//   contentDoc: S.Any,
// }));


// TODO: Below should not be exposed to content generator implementors, above should

/**
 * When working with generated content,
 * we want to know the ID of the adapter that generated it
 * in order to retrieve requisite schema/node views
 * needed for converting to HTML or providing fancier views/widgets.
 */
export const AdapterGeneratedResourceContentSchema = S.Struct({
  adapterID: S.String.pipe(S.nonEmptyString()),
  content: S.Union(S.Null, ResourceContentSchema),
});
export type AdapterGeneratedResourceContent = S.Schema.Type<typeof AdapterGeneratedResourceContentSchema>;
