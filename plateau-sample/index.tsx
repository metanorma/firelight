import React, { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import * as S from '@effect/schema/Schema';
import { View, Flex, Text, Grid, Header, Heading, ActionButton, defaultTheme, Provider } from '@adobe/react-spectrum';
import { TreeView, TreeViewItem } from '@react-spectrum/tree';
import * as classes from './app.module.css';

const GRID_AREAS = [
  'header sidebar content',
];
const GRID_COLUMNS = [
  '50px', '20%', '1fr',
];

const App: React.FC<{
  doc: Document;
  sections: Record<string, Section>;
  getSectionEl: (sectionID: string) => Element;
}> = function ({ doc, sections, getSectionEl }) {
  const navHeader = getNavHeader(doc) ?? "ToC";
  const [sectionID, setSectionID] = useState<string | null>(null);
  const handleTreeViewAction = useCallback(function (sectionID: number | string) {
    console.debug("Handling tree view action", arguments);
    if (typeof sectionID === 'string' && sections[sectionID]) {
      setSectionID(sectionID);
    } else {
      console.error("Invalid section selected", sectionID);
    }
  }, [sections, setSectionID]);

  return (
    <Provider theme={defaultTheme} locale={getLang(doc)}>
      <Grid areas={GRID_AREAS} columns={GRID_COLUMNS} height="100vh">
        <View backgroundColor="celery-400">
          <div className={classes.docTitle}>
            <Header>
              Plateau
            </Header>
          </div>
        </View>
        <View backgroundColor="gray-200">
          <div className={classes.docNav}>
            <TreeView
                selectionStyle="highlight"
                onAction={handleTreeViewAction}>
              <TreeViewItem textValue={navHeader} id="header">
                <Text>{navHeader}</Text>
              </TreeViewItem>
              <SectionTreeViewItems sections={sections} />
            </TreeView>
          </div>
        </View>
        <Flex>
          <div className={classes.docContent}>
            {sectionID !== null
              ? <Section {...sections[sectionID]} getSectionEl={getSectionEl} />
              : "Please pick a section."}
          </div>
        </Flex>
      </Grid>
    </Provider>
  );
}


const SectionTreeViewItems: React.FC<{
  sections: Record<string, Section>;
}> = function ({ sections }) {
  return Object.values(sections).
  filter(sect => !sect.parentSectionID).
  map(({ title, elID, childSections }) =>
    <TreeViewItem textValue={title ?? elID} key={elID} id={elID} hasChildItems={Object.values(childSections).length > 0}>
      <Text key={elID}>
        {title ?? elID}
      </Text>
      {Object.values(childSections).map(({ title, elID, childSections }) =>
        <TreeViewItem textValue={title ?? elID} key={elID} id={elID} hasChildItems={Object.values(childSections).length > 0}>
          <Text key={elID}>
            {title ?? elID}
          </Text>
          {Object.values(childSections).map(({ title, elID, childSections }) =>
            <TreeViewItem textValue={title ?? elID} key={elID} id={elID} hasChildItems={Object.values(childSections).length > 0}>
              <Text key={elID}>
                {title ?? elID}
              </Text>
              {Object.values(childSections).map(({ title, elID, childSections }) =>
                <TreeViewItem textValue={title ?? elID} key={elID} id={elID} hasChildItems={Object.values(childSections).length > 0}>
                  <Text key={elID}>
                    {title ?? elID}
                  </Text>
                </TreeViewItem>
              )}
            </TreeViewItem>
          )}
        </TreeViewItem>
      )}
    </TreeViewItem>
  );
};

const Section: React.FC<Section & { getSectionEl: (sectionID: string) => Element }> =
function ({ getSectionEl, childSections, title, elID }) {
  const section = getSectionEl(elID);

  if (!section) {
    return <>Missing section data for {elID}</>;
  }

  const headingFromDepth = getHeadingLevelFromDepth(
    section?.querySelector('title')?.getAttribute('depth') ?? undefined
  );

  const actualLevel = headingFromDepth ?? 1;

  console.debug("Getting heading level", section.querySelector('title'));

  return (
    <section>
      <Heading level={actualLevel}>
        {title ?? elID}
      </Heading>
      <div
        dangerouslySetInnerHTML={{
          __html: [...section.children].
            filter(el => el.tagName !== 'title').
            map(el => el.outerHTML).
            join(' '),
        }}
      />
      {/*Object.values(childSections).map(sect =>
        <Section
          key={sect.elID}
          {...sect}
          getSectionEl={getSectionEl}
        />
      )*/}
    </section>
  );
}

function getNavHeader(doc: Document) {
  return doc.querySelector('preface clause[type=toc] title')?.textContent ?? null;
}

function getLang(doc: Document) {
  return doc.querySelector('bibdata language[current]')!.textContent!;
}

interface Section {
  /** ToC ID of the section. */
  elID: string;

  /** Section title. */
  title?: string;

  childSections: Record<string, Section>;

  parentSectionID?: string;
}

function getSectionElements(clause: Element): Readonly<(Section & { el: Element })[]> {
  return [...clause.children].
  filter(el => el.tagName === 'clause' || el.tagName === 'abstract').
  filter(el => el.getAttribute('type') !== 'toc').
  filter(el => el.getAttribute('id')?.startsWith('toc')).
  map((el, idx) => {
    const elID = el.getAttribute('id') ?? `clause${idx + 1}`;
    return {
      elID,
      el,
      title: el.querySelector('title')?.textContent ?? undefined,
      childSections: {},
    };
  });
}

// const SectionNavItem: React.FC<{
//   elID: string;
//   getSection: (sectionID: string) => Section;
//   onNavigate?: (sectionID: string) => void;
//   level: number;
// }> = function ({ level, elID, getSection, onNavigate }) {
//   const { title, childSections } = useMemo(() => getSection(elID), [elID]);
//   return (
//     <TreeViewItem textValue={title ?? elID}>
//       <Text>
//         {title ?? elID}
//       </Text>
//       {level < 2
//         ? childSections.map(elID =>
//             <SectionNavItem
//               key={elID}
//               elID={elID}
//               getSection={getSection}
//               onNavigate={onNavigate}
//               level={level + 1}
//             />
//           )
//         : null}
//     </TreeViewItem>
//   );
//  
// }

const HeadingLevelSchema = S.Union(
  S.Literal(1),
  S.Literal(2),
  S.Literal(3),
  S.Literal(4),
  S.Literal(5),
  S.Literal(6),
);

type HeadingLevel = S.Schema.Type<typeof HeadingLevelSchema>;

// function getSections(
//   clause: Element,
//   getSectionEl: (sectionID: string) => Element,
//   level?: HeadingLevel,
// ) {
//   const headingFromDepth = getHeadingLevelFromDepth(
//     clause.querySelector('title')?.getAttribute('depth') ?? undefined
//   );
// 
//   const actualLevel = headingFromDepth ?? level ?? 1;
// 
//   if (headingFromDepth !== level) {
//     console.warn(
//       "Heading level from depth does not match supposed heading level",
//       headingFromDepth,
//       level);
//   }
// 
//   const nextLevel = (actualLevel < 6 ? actualLevel + 1 : 6) as HeadingLevel;
// 
//   return getSectionElements(clause).map(function ({ elID, title }) {
//     return (
//       <section id={elID}>
//         <Heading level={actualLevel}>
//           {title ?? elID}
//         </Heading>
//         <div
//           dangerouslySetInnerHTML={{
//             __html: [...section.children].
//               filter(el => el.tagName !== 'title').
//               map(el => el.outerHTML).
//               join(' '),
//           }}
//         />
//         {getSections(section, nextLevel)}
//       </section>
//     );
//   });
// }

function getHeadingLevelFromDepth(depth?: string): HeadingLevel | null {
  try {
    return S.decodeUnknownSync(HeadingLevelSchema)(depth);
  } catch (e) {
    return null;
  }
}


function accumulateSections(
  clause: Element,
  sectionMeta: Record<string, Section>,
  sectionEls: Record<string, Element>,
  onSection?: (sect: Section) => void,
  parentSectionID?: string,
): void {
  for (const sect of getSectionElements(clause)) {
    const { elID, title, childSections } = sect;
    console.debug("Accumulating", elID);
    const meta = { elID, title, childSections, parentSectionID };
    function handleChild(childSect: Section) {
      console.debug("Handling child", childSect.elID);
      const { elID, title, childSections } = childSect;
      const childMeta = { elID, title, childSections, parentSectionID };
      meta.childSections[childSect.elID] = childMeta;
    }
    sectionMeta[sect.elID] = meta;
    sectionEls[sect.elID] = sect.el;
    onSection?.(sect);
    accumulateSections(
      sect.el,
      sectionMeta,
      sectionEls,
      handleChild,
      elID,
    );
  }
}


async function initApp() {
  const rawXML = await (await fetch('./document.xml')).text();

  const doc = (new DOMParser()).parseFromString(rawXML, 'text/xml');
  console.debug("Got doc", doc);

  const langCode = getLang(doc);
  document.querySelector('html')!.setAttribute('lang', langCode);

  const rootEl = document.getElementById('app')!;
  const root = createRoot(rootEl);

  const sectionMeta: Record<string, Section> = {};
  const sectionEls: Record<string, Element> = {};
  accumulateSections(doc.querySelector('preface')!, sectionMeta, sectionEls);
  accumulateSections(doc.querySelector('sections')!, sectionMeta, sectionEls);
  console.debug("Accumulated sections", sectionMeta, sectionEls);

  root.render(<App doc={doc} sections={sectionMeta} getSectionEl={sectID => sectionEls[sectID]} />);
}

initApp();
