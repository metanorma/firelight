//import { type Lunr } from 'lunr';

/**
 * Modify Lunr.js tokenizer to use N-gram segmentation.
 * Performance considerations:
 * - N-gram increases index size and search time. Adjust maxSize based on actual needs.
 * - Larger maxSize values improve matching precision but lead to larger index sizes.
 */
const MIN_SIZE = 2;
const MAX_SIZE = 6;
export function enableNewLunrJaTokenizer(lunr: any) {
  lunr.ja.tokenizer = function (obj: any) {
    if (!arguments.length || obj == null || obj === undefined) return [];

    let str = obj
      .toString()
      .toLowerCase()
      .replace(/^\s+/, "")
      .replace(/\s+$/, "");
    if (str.length === 0) return [];

    // Define the N-gram function
    const ngrams = (text: string, minSize = 2, maxSize = 6) => {
      let results: any[] = [];
      for (let size = minSize; size <= maxSize; size++) {
        for (let i = 0; i <= text.length - size; i++) {
          let token = text.substring(i, i + size);
          results.push({
            str: token,
            metadata: { position: [i, i + size - 1], index: i },
          });
        }
      }
      return results;
    };
    /**
     * maxSize is set to 15 by default, meaning the maximum search term length.
     * In most cases, 15 characters are enough for typical searches.
     * It can be increased up to str.length, which is the length of the indexed string.
     */
    const tokens = ngrams(str, MIN_SIZE, Math.min(MAX_SIZE, str.length)); // Ensure maxSize does not exceed the string length

    return tokens.map(
      (tokenData) => new lunr.Token(tokenData.str, tokenData.metadata)
    );
  };
}
