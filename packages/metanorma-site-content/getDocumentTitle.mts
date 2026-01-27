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
  /**
   * Title IDs to choose from.
   * If not defined, will obtain from bibdata graph’s `hasTitle`.
   */
  titles_: string[] | null,
  bibdata: Readonly<RelationGraphAsList>,
  forLanguage: string | undefined,
  requiredType?: string[],
): undefined | {
  hopefullyASuitableTitle: [titleID: string, title: string, lang: string],
  titlesInOtherLanguages: [titleID: string, title: string, lang: string][],
} {
  // Find non-empty titles
  const titles = titles_ ?? resolveChain(bibdata, ['hasTitle']).
  map(([, titleID]) => titleID).
  filter(titleID =>
    // NOTE: This is inefficiently later called again
    // for the selected title
    getTextContent(bibdata, titleID).join('').trim() !== ''
  );

  const maybeCandidateInCurrentLanguage = getMostFittingTitleID(
    requiredType ?? ['title-part', 'title-main'],
    ['text/plain'],
    forLanguage ? [forLanguage] : [],
    titles,
    bibdata,
  );

  const chosenType = maybeCandidateInCurrentLanguage
    ? findValue(bibdata, maybeCandidateInCurrentLanguage, 'hasType')
    : undefined;
  if (chosenType && requiredType && !requiredType.includes(chosenType)) {
    return undefined;
  }

  //const finalCandidate = maybeCandidateInCurrentLanguage
  //?? getMostFittingTitleID(
  //  ['title-part', 'title-main'],
  //  ['text/plain'],
  //  titles,
  //  bibdata,
  //);

  const titlesInOtherLanguages = maybeCandidateInCurrentLanguage
    ? Object.entries(
        titles.
        map(titleID => [
          titleID,
          findValue(bibdata, titleID, 'hasLanguage'),
        ] as [titleID: string, lang: string | undefined]).
        filter(([titleID, lang]) =>
          lang !== forLanguage &&
          titleID !== maybeCandidateInCurrentLanguage
        ).
        reduce((prev, curr) => ({
          ...prev,
          [curr[1] ?? 'N/A']:
            [...(prev[curr[1] ?? 'N/A'] ?? []), curr[0]],
        }), {} as Record<string, string[]>)).
      map(([, titleIDs]) => {
        const candidate = getMostFittingTitleID(
          ['title-part', 'title-main'], ['text/plain'], [], titleIDs, bibdata,
        );
        if (candidate) {
          return [
            candidate,
            getTextContent(bibdata, candidate).join(''),
            findValue(bibdata, candidate, 'hasLanguage') ?? '',
          ] as [string, string, string];
        } else {
          return null;
        }
      }).
      filter(v => v !== null)
    : [];

  if (!maybeCandidateInCurrentLanguage) {
    return undefined;
  } else {
    return {
      hopefullyASuitableTitle: [
        maybeCandidateInCurrentLanguage,
        getTextContent(bibdata, maybeCandidateInCurrentLanguage).join(''),
        findValue(bibdata, maybeCandidateInCurrentLanguage, 'hasLanguage') ?? '',
      ],
      titlesInOtherLanguages,
    };
  }
}

/**
 * Among a list of titles, finds the one that ticks the most boxes:
 *
 * - preferred type (e.g., 'title-main')
 * - preferred format (e.g., 'text/plain')
 * - preferred language (e.g., 'ja')
 */
function getMostFittingTitleID(
  preferredTypes: string[],
  supportedFormats: string[],
  preferredLanguages: string[],
  titleIDs: string[],
  graph: Readonly<RelationGraphAsList>,
): string | undefined {

  if (titleIDs.length < 1) {
    return undefined;
  }

  const titlesMatchingFormat = supportedFormats.
  map(f => titleIDs.filter(id => findValue(graph, id, 'hasFormat') === f)).
  reduce((prev, curr) => [...prev, ...curr], []);

  const supportedTitleIDs = titlesMatchingFormat.length > 0
    ? titlesMatchingFormat
    : titleIDs;

  const titlesMatchingType = preferredTypes.
  map(t => supportedTitleIDs.filter(id => findValue(graph, id, 'hasType') === t)).
  reduce((prev, curr) => [...prev, ...curr], []);

  const supportedTitleIDs2 = titlesMatchingType.length > 0
    ? titlesMatchingType
    : supportedTitleIDs;

  const fittingLanguage = preferredLanguages.
  map(l => supportedTitleIDs2.filter(id => findValue(graph, id, 'hasLanguage') === l)).
  reduce((prev, curr) => [...prev, ...curr], []);

  return fittingLanguage[0] ?? supportedTitleIDs2[0];
}
