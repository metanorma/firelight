import { type RelationGraphAsList } from 'anafero/index.mjs';

import {
  resolveChain,
  getTextContent,
  findValue,
} from './graph-query-util.mjs';


interface ObtainedTitle {
  /** Subject ID. */
  subject: string;
  /** Plain-text content of the title. */
  content: string;
  language?: string | undefined;
  /** E.g., title-main, title-part, title-intro. */
  type?: string | undefined;
}


/**
 * Picks the most suitable title in current language,
 * along with titles in other languages.
 *
 * For now only returns plain text as title content.
 */
export default function getDocumentTitle(
  /**
   * Title IDs to choose from.
   * If not defined, will obtain from bibdata graph’s `hasTitle`.
   * This requires that given graph is bibdata graph.
   * If provided graph is, e.g., a clause, then title IDs to choose from
   * must be provided.
   */
  fromTitles: string[] | null,
  graph: Readonly<RelationGraphAsList>,
  forLanguage: string | undefined,
  requiredType?: string[],
): undefined | {
  mainTitle: ObtainedTitle,
  titlesInOtherLanguages: ObtainedTitle[],
} {
  // Find non-empty titles
  const titles = fromTitles ?? resolveChain(graph, ['hasTitle']).
  map(([, titleID]) => titleID).
  filter(titleID =>
    // NOTE: This is inefficiently later called again
    // for the selected title
    getTextContent(graph, titleID).join('').trim() !== ''
  );

  const maybeCandidateInCurrentLanguage = getMostFittingTitleID(
    requiredType ?? ['title-part', 'title-main'],
    ['text/plain'],
    forLanguage ? [forLanguage] : [],
    titles,
    graph,
  );

  const chosenType = maybeCandidateInCurrentLanguage
    ? findValue(graph, maybeCandidateInCurrentLanguage, 'hasType')
    : undefined;
  if (chosenType && requiredType && !requiredType.includes(chosenType)) {
    return undefined;
  }

  //const finalCandidate = maybeCandidateInCurrentLanguage
  //?? getMostFittingTitleID(
  //  ['title-part', 'title-main'],
  //  ['text/plain'],
  //  titles,
  //  graph,
  //);

  const titlesInOtherLanguages = maybeCandidateInCurrentLanguage
    ? Object.entries(
        titles.
        map(titleID => [
          titleID,
          findValue(graph, titleID, 'hasLanguage'),
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
          requiredType ?? ['title-part', 'title-main'],
          ['text/plain'],
          [],
          titleIDs,
          graph,
        );
        const chosenType = candidate
          ? findValue(graph, candidate, 'hasType')
          : undefined;
        if (chosenType && requiredType && !requiredType.includes(chosenType)) {
          return null;
        }
        if (candidate) {
          return {
            subject: candidate,
            content: getTextContent(graph, candidate).join(''),
            language: findValue(graph, candidate, 'hasLanguage') ?? undefined,
            type: chosenType ?? undefined,
          };
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
      mainTitle: {
        subject: maybeCandidateInCurrentLanguage,
        content: getTextContent(graph, maybeCandidateInCurrentLanguage).join(''),
        language: findValue(graph, maybeCandidateInCurrentLanguage, 'hasLanguage') ?? undefined,
        type: chosenType ?? undefined,
      },
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
