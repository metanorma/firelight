import { type RelationGraphAsList } from 'anafero/index.mjs';

import {
  resolveChain,
  getTextContent,
  findValue,
} from './graph-query-util.mjs';


/**
 * Picks the most suitable title in current language,
 * along with titles in other languages.
 */
export default function getDocumentTitle(
  currentLanguage: string,
  bibdata: Readonly<RelationGraphAsList>,
): {
  hopefullyASuitableTitle: [titleID: string, title: string],
  titlesInOtherLanguages: [titleID: string, title: string][],
} {
  // Find non-empty titles
  const titles = resolveChain(bibdata, ['hasTitle']).
  map(([, titleID]) => titleID).
  filter(titleID =>
    // NOTE: This is inefficiently later called again
    // for the selected title
    getTextContent(bibdata, titleID).join('').trim() !== ''
  );

  // Find titles in current language
  const titlesInCurrentLanguage = titles.filter(titleID =>
    findValue(bibdata, titleID, 'hasLanguage') === currentLanguage
  );

  const maybeCandidateInCurrentLanguage = getMostFittingTitleID(
    'main', 'text/plain', titlesInCurrentLanguage, bibdata,
  );

  const finalCandidate = maybeCandidateInCurrentLanguage
  ?? getMostFittingTitleID(
    'main', 'text/plain', titles, bibdata,
  );

  const titlesInOtherLanguages = maybeCandidateInCurrentLanguage
    ? Object.entries(
        titles.
        map(titleID => [
          titleID,
          findValue(bibdata, titleID, 'hasLanguage'),
        ] as [titleID: string, lang: string | undefined]).
        filter(([titleID, lang]) =>
          lang !== currentLanguage &&
          titleID !== finalCandidate
        ).
        reduce((prev, curr) => ({
          ...prev,
          [curr[1] ?? 'N/A']:
            [...(prev[curr[1] ?? 'N/A'] ?? []), curr[0]],
        }), {} as Record<string, string[]>)).
      map(([, titleIDs]) => {
        const candidate = getMostFittingTitleID(
          'main', 'text/plain', titleIDs, bibdata,
        );
        return [
          candidate,
          getTextContent(bibdata, candidate).join(''),
        ] as [string, string];
      })
    : [];

  if (!finalCandidate) {
    console.error("Couldn’t find a title", JSON.stringify({ titlesInCurrentLanguage, titles }));
    throw new Error("Couldn’t find a title");
  } else {
    return {
      hopefullyASuitableTitle: [
        finalCandidate,
        getTextContent(bibdata, finalCandidate).join(''),
      ],
      titlesInOtherLanguages,
    };
  }
}

/**
 * Among a list of titles, finds the one that ticks the most boxes:
 *
 * - preferred type (MN specific, e.g., 'title-main')
 * - preferred format (e.g., 'text/plain')
 *
 * Or, returns the first title available.
 */
function getMostFittingTitleID(
  preferredType: string,
  preferredFormat: string,
  titleIDs: string[],
  bibdata: Readonly<RelationGraphAsList>,
): string {
  // I’m sure there’s a better way…
  const sets = [
    titleIDs.filter(titleID =>
      findValue(bibdata, titleID, 'hasType') === preferredType
    ),
    titleIDs.filter(titleID =>
      findValue(bibdata, titleID, 'hasFormat') === preferredFormat
    ),
  ];
  const titleMatches = sets.flat().
  reduce(
    (prev, curr) => ({ ...prev, [curr]: (prev[curr] ?? 0) + 1 }),
    {} as Record<string, number>,
  );
  const titleWithMostMatches = Object.keys(titleMatches).
  reduce((title1, title2) =>
    titleMatches[title1]! > titleMatches[title2]!
      ? title1
      : title2
  );
  return titleWithMostMatches ?? titleIDs[0];
}
