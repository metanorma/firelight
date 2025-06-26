import lunr, { type Index as LunrIndex } from 'lunr';


// Initialize search
import enableLunrStemmer from 'lunr-languages/lunr.stemmer.support';
import enableTinyLunrSegmenter from 'lunr-languages/tinyseg';
import enableLunrFr from 'lunr-languages/lunr.fr';
import enableLunrJa from 'lunr-languages/lunr.ja';
import enableLunrMultiLanguage from 'lunr-languages/lunr.multi';

const LANGUAGE_SUPPORT = {
  ja: enableLunrJa,
  fr: enableLunrFr,
} as const;

enableLunrStemmer(lunr);
enableTinyLunrSegmenter(lunr);
// End initialize search


let lunrIdx: LunrIndex | null = null;

/**
 * Loads Lunr index and avoids doing it twice
 * (and overwriting Lunr pipeline, which may be fine but still),
 * but MUST be called synchronously.
 */
export function loadLunrIndex(serializedIndex: any) {
  if (lunrIdx !== null) {
    console.debug("Lunr: already initialized");
    return lunrIdx;
  }

  console.debug("Lunr: initializing");

  const nonDefaultLanguages =
    Object.keys(LANGUAGE_SUPPORT) as (keyof typeof LANGUAGE_SUPPORT)[];

  if (nonDefaultLanguages.length > 1) {

    console.debug(`Lunr: enabling extra languages ${nonDefaultLanguages.join(', ')}`);

    for (const lang of nonDefaultLanguages) {
      LANGUAGE_SUPPORT[lang](lunr);
    }

    enableLunrMultiLanguage(lunr);
    ((lunr as any).multiLanguage(...['en', ...nonDefaultLanguages]));

    const lunrTokenizer = lunr.tokenizer;
    (lunr as any).tokenizer = function(x: any) {
      // Combine default English Lunr tokens with tokens obtained
      // from first language-specific tokenizer, deduplicating them
      const baseLunrTokens = lunrTokenizer(x);
      const tokens = [...baseLunrTokens];
      for (const lang of nonDefaultLanguages) {
        const tokenizer = (lunr as any)[lang].tokenizer;
        if (tokenizer) {
          const langTokens: lunr.Token[] = tokenizer(x);
          // Add language-specific tokens, unless they already exist
          // after English tokenizer
          tokens.push(...langTokens.filter(t =>
            !baseLunrTokens.find(bt => bt.toString() === t.toString())
          ));
        } else {
          console.warn(`Language ${lang} does not ship a tokenizer?`);
        }
      }
      return tokens;
    };
    const lunrStopWordFilter = lunr.stopWordFilter;
    (lunr as any).stopWordFilter = function(token: any) {
      return (
        lunrStopWordFilter(token)
        // If a token is a stop word in ANY of supported languages,
        // then it is considered a stop word. This means the more languages
        // we support, the less precise search would be, for now.
        && !nonDefaultLanguages.map(lang =>
          (lunr as any)[lang].stopWordFilter(token)
        ).includes(false)
      ) ? token : undefined;
    };
  }

  //const enableLanguageSupport = (
  //  (primaryLanguageDetected && primaryLanguageDetected !== 'en')
  //    ? LANGUAGE_SUPPORT[primaryLanguageDetected as keyof typeof LANGUAGE_SUPPORT]
  //    : undefined
  //) ?? undefined;

  //if (enableLanguageSupport) {
  //  console.debug(`Lunr: enabling language “${primaryLanguage}”`);

  //  enableLanguageSupport(lunr);
  //}

  // This should run only once, since primaryLanguage wouldn’t change.
  // NOTE: Load multi-language after loading index, because we need its pipeline
  // and it doesn’t get serialized for some reason.

  console.time("Lunr: load index");
  lunrIdx = lunr.Index.load(serializedIndex);
  console.timeEnd("Lunr: load index");

  return lunrIdx;
}
