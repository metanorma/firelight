import { type RelationGraphAsList } from 'anafero/index.mjs';
import { type Node as ProseMirrorNode } from 'prosemirror-model';
import { findValue, findAll } from './graph-query-util.mjs';


/** Transforms given resource to ProseMirror node(s). */
type NodeProcessorBase<T> = (
  /** Subject URI of the root resource. */
  resource: string,
  /**
   * Mutable state shared between node processors
   * for non-locality.
   * Non-locality is bad and best avoided.
   * IMPORTANT: If you have to use it, keep lean and specific.
   */
  state: T,
) => ProseMirrorNode | undefined | (ProseMirrorNode | undefined)[];
// TODO: This union probably causes a lot of unnecessary checks…

export type NodeProcessor = NodeProcessorBase<NodeProcessorState>;

export interface NodeProcessorState {
  annotations: {
    /** Footnotes resource IDs mapped to footnote data. */
    footnotes: Record<string, Footnote>;
    /**
     * Must be set before processing a container
     * to which footnotes should be scoped
     * (e.g. a table in case of PLATEAU documents),
     * and unset after.
     */
    currentFootnoteScope: string | null;
  };
}

export interface Footnote {
  /** Body of footnote. */
  content: ProseMirrorNode[];
  /** Cue in the text. */
  cue?: string;
  /** How many times this footnote had been referenced so far. */
  referenceCount: number;
}


export function makeSplittingNodeProcessor(
  section: Readonly<RelationGraphAsList>,
  /**
   * Returns a node processor if given part type is an incompatible part,
   * e.g. a `note` as direct child of an ordered list.
   *
   * Should return undefined for any part type that is allowed
   * (e.g., a list item as direct child of an ordered list).
   */
  getNodeProcessorForIncompatibleDescendant:
    (partType: string) => NodeProcessor | undefined,
  makeNode:
    (subj: string, parts: ProseMirrorNode[]) => ProseMirrorNode,
  processValidDescendant: NodeProcessor,
): NodeProcessor {
  return function splittingNodeProcessor(subj, state) {
    const outputNodes: ProseMirrorNode[] = [];
    
    let splitCounter = 0;
    const currentSplitParts: string[] = [];
    
    /**
     * Processes accumulated so far node parts
     * into respective ProseMirror node and appends it to content.
     */
    function flushAccumulatedSplit() {
      if (currentSplitParts.length < 1) {
        return;
      }
      const resourceID = splitCounter > 0
        ? `${subj}-split-${splitCounter}`
        : subj;
      //console.debug("Flushing split", subj, splitCounter);
      const currentSplitContents: ProseMirrorNode[] = [];
      let currentPart;
      while ((currentPart = currentSplitParts.shift()) !== undefined) {
        const childNodes = processValidDescendant(currentPart, state);
        for (const cn of (Array.isArray(childNodes) ? childNodes : [childNodes]).filter(n => n !== undefined)) {
          currentSplitContents.push(cn);
        }
      }
      const nodeSplit = makeNode(resourceID, currentSplitContents);
      outputNodes.push(nodeSplit);
      splitCounter += 1;
    }
    
    const parts = findAll(section, subj, 'hasPart');
    for (const part of parts) {
      const partType = findValue(section, part, 'type');
      const incompatibleDescendantProcessor = partType
        ? getNodeProcessorForIncompatibleDescendant(partType)
        : null;
      if (incompatibleDescendantProcessor) {
        // Flush node split and output block node that shouldn’t be a child
        flushAccumulatedSplit();
        const _blockNodes = incompatibleDescendantProcessor(part, state);
        const blockNodes = Array.isArray(_blockNodes)
          ? _blockNodes
          : [_blockNodes];
        for (const node of blockNodes.filter(n => n !== undefined)) {
          outputNodes.push(node);
        }
      } else {
        // Output block node that can be a child
        currentSplitParts.push(part);
      }
    }
    flushAccumulatedSplit();
    
    return outputNodes;
  }
}
