// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import { useXmlData } from '../context';
import ContentSection from './ContentSection';
import Cover from './Cover';

import { romanize } from '../utility';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPageForOGC() {
    const { xmlJson, xml } = useXmlData();

    // split the xml data by content section and save those as array
    const contentSections = useMemo(() => {
        //verify the type of document.
        let standard = '';
        if (xmlJson['itu-standard']) {
            standard = 'itu-standard';
        } else if (xmlJson['iso-standard']) {
            standard = 'iso-standard';
        } else if (xmlJson['ogc-standard']) {
            standard = 'ogc-standard';
        }

        let index = 0;
        let count = 1;
        let roman = 1;
        let annex = 0;

        const menuItem: any[] = [];

        const getMenuItem = (
            data: any,
            hasIndex: boolean | number = false,
            hasRoman: boolean = false,
            isAnnex: boolean = false
        ): any => {
            let returnData: any = {};
            // returnData.index = data['$']['displayorder']

            if (hasIndex) {
                if (typeof hasIndex === 'number') {
                    returnData.index = roman + hasIndex - 2;
                    returnData.titleIndex = hasIndex.toString();
                    if (hasIndex === 3) {
                        menuItem[roman] = {};
                        menuItem[roman - 1] = {};
                    }
                } else {
                    //check whether the count is 3 or 4 and the value is available
                    if (standard === 'ogc-standard') {
                        if (count === 3) {
                            console.log(
                                menuItem[roman + count - 2],
                                roman + count - 2,
                                index,
                                '3'
                            );
                        }
                        if (
                            count === 3 &&
                            menuItem[roman + count - 2] !== undefined
                        ) {
                            count++;
                            index++;
                        }
                        if (
                            count === 4 &&
                            menuItem[roman + count - 2] !== undefined
                        ) {
                            count++;
                            index++;
                        }
                    }
                    returnData.titleIndex = count.toString();
                    returnData.index = index++;
                    count++;
                }
            } else {
                returnData.index = index++;
            }

            if (hasRoman) {
                let romanNum = romanize(roman);
                roman++;
                let clone = Object.assign({}, data);
                clone.romanNum = romanNum;
                returnData.data = clone;
            } else {
                returnData.data = data;
            }

            if (isAnnex) {
                returnData.titleIndex = String.fromCharCode(65 + annex);
                annex++;
            }

            return returnData;
        };

        if (standard === 'ogc-standard' && xmlJson[standard]) {
            if (xmlJson[standard]['preface']) {
                //abstract part
                if (xmlJson[standard]['preface'][0]?.abstract) {
                    const abstract = getMenuItem(
                        xmlJson[standard]['preface'][0].abstract[0],
                        false,
                        true
                    );
                    menuItem[abstract.index] = abstract;
                }

                //keywords part
                if (xmlJson[standard]['bibdata'][0]?.keyword) {
                    if (xmlJson[standard]['bibdata'][0]?.keyword?.length > 0) {
                        const keywords =
                            xmlJson[standard]['bibdata'][0]?.keyword.join(' ');
                        let data = {
                            data: {
                                id: '_keywords',
                                p: [
                                    'The following organizations submitted this Document to the Open Geospatial Consortium (OGC):',
                                    keywords
                                ],
                                romanNum: romanize(roman++)
                            },
                            index: index++
                        };
                        menuItem[data.index] = data;
                    }
                }

                //preface part(foreword)
                if (xmlJson[standard]['preface'][0]?.foreword) {
                    const foreword = getMenuItem(
                        xmlJson[standard]['preface'][0].foreword[0],
                        false,
                        true
                    );
                    menuItem[foreword.index] = foreword;
                }

                if (xmlJson[standard]['preface'][0]?.clause) {
                    //security considerations
                    xmlJson[standard]['preface'][0]?.clause.map(
                        (child: any) => {
                            if (
                                child?.title &&
                                child.title[0] &&
                                child.title[0].toLowerCase() ===
                                    'Security considerations'.toLocaleLowerCase()
                            ) {
                                const consideration = getMenuItem(
                                    child,
                                    false,
                                    true
                                );
                                menuItem[consideration.index] = consideration;
                            }
                        }
                    );

                    //Revision history
                    xmlJson[standard]['preface'][0]?.clause.map(
                        (child: any) => {
                            if (
                                child?.title &&
                                child.title[0] &&
                                child.title[0].toLowerCase() ===
                                    'Revision history'.toLocaleLowerCase()
                            ) {
                                const revision = getMenuItem(
                                    child,
                                    false,
                                    true
                                );
                                menuItem[revision.index] = revision;
                            }
                        }
                    );
                }

                //submitting organizations
                if (xmlJson[standard]['bibdata'][0]?.contributor) {
                    if (
                        xmlJson[standard]['bibdata'][0]?.contributor?.length > 0
                    ) {
                        let organizations: string[] = [];
                        xmlJson[standard]['bibdata'][0]?.contributor.map(
                            (child: any) => {
                                if (
                                    child?.organization &&
                                    child.organization[0]?.name[0]
                                ) {
                                    organizations.push(
                                        child?.organization[0]?.name[0]
                                    );
                                }
                            }
                        );

                        let data = {
                            index: index++,
                            data: {
                                id: '_organizations',
                                p: 'The following organizations submitted this Document to the Open Geospatial Consortium (OGC):',
                                organizations
                            },
                            romanNum: romanize(roman++)
                        };

                        menuItem[data.index] = data;
                    }
                }

                //submission part
                if (xmlJson[standard]['preface']) {
                    if (xmlJson[standard]['preface'][0]?.submitters) {
                        const submitters = getMenuItem(
                            xmlJson[standard]['preface'][0].submitters[0],
                            false,
                            true
                        );
                        menuItem[submitters.index] = submitters;
                    }
                }

                if (xmlJson[standard]['preface'][0]?.clause) {
                    //introduction part
                    xmlJson[standard]['preface'][0]?.clause.map(
                        (child: any) => {
                            if (
                                child?.title &&
                                child.title[0] &&
                                child.title[0].toLowerCase() ===
                                    'Introduction'.toLocaleLowerCase()
                            ) {
                                const introduction = getMenuItem(
                                    child,
                                    false,
                                    true
                                );
                                menuItem[introduction.index] = introduction;
                            }
                        }
                    );

                    //Reference Notes part
                    xmlJson[standard]['preface'][0]?.clause.map(
                        (child: any) => {
                            if (
                                child?.title &&
                                child.title[0] &&
                                child.title[0].toLowerCase() ===
                                    'Reference notes'.toLocaleLowerCase()
                            ) {
                                const referenceNotes = getMenuItem(
                                    child,
                                    false,
                                    true
                                );
                                menuItem[referenceNotes.index] = referenceNotes;
                            }
                        }
                    );
                }

                //Normative References
                if (xmlJson[standard]['bibliography']) {
                    const normativeRow = Object.values(
                        xmlJson[standard]['bibliography'][0]['references']
                    ).find((child: any) => {
                        if (
                            child?.title[0].toLowerCase() ===
                            'Normative references'.toLocaleLowerCase()
                        )
                            return true;
                        return false;
                    });

                    let normativeReferences = getMenuItem(normativeRow, 3);
                    console.log(normativeReferences, 'normative');
                    menuItem[normativeReferences.index] = normativeReferences;
                    console.log(menuItem, 'include normatie');
                }

                // terms and definitions
                if (xmlJson[standard]['sections']) {
                    if (xmlJson[standard]['sections'][0]?.terms) {
                        let terms = getMenuItem(
                            xmlJson[standard]['sections'][0]?.terms[0],
                            4
                        );
                        menuItem[terms.index] = terms;
                    }
                }

                //sections part
                if (xmlJson[standard]['sections']) {
                    if (xmlJson[standard]['sections'][0]?.clause) {
                        xmlJson[standard]['sections'][0].clause.map(
                            (child: any) => {
                                let item = getMenuItem(child, true);
                                menuItem[item.index] = item;
                            }
                        );
                    }
                }

                //binary part
                if (xmlJson[standard]['binary']) {
                    xmlJson[standard]['binary'].map((child: any) => {
                        let item = getMenuItem(child, false, false, true);
                        menuItem[item.index] = item;
                    });
                }

                //context part
                if (xmlJson[standard]['context']) {
                    xmlJson[standard]['context'].map((child: any) => {
                        let item = getMenuItem(child, false, false, true);
                        menuItem[item.index] = item;
                    });
                }

                //annex part
                if (xmlJson[standard]['annex']) {
                    xmlJson[standard]['annex'].map((child: any) => {
                        let item = getMenuItem(child, false, false, true);
                        menuItem[item.index] = item;
                    });
                }

                //Bibliography part
                if (xmlJson[standard]['bibliography']) {
                    const bibliographyRow = Object.values(
                        xmlJson[standard]['bibliography'][0]['references']
                    ).find((child: any) => {
                        if (
                            child?.title[0].toLowerCase() ===
                            'Bibliography'.toLocaleLowerCase()
                        )
                            return true;
                        return false;
                    });

                    let bibliographyReferences = getMenuItem(bibliographyRow);
                    menuItem[bibliographyReferences.index] =
                        bibliographyReferences;
                }
            }
        }

        const resultArray: any[] = [];
        menuItem.map((item: any) => {
            if (item?.data) resultArray.push(item);
        });
        return resultArray;
    }, [xmlJson]);

    return (
        <div className="main-page" id="main_page">
            <Cover />
            {contentSections?.length > 0 &&
                contentSections.map((item: any) =>
                    item?.data ? (
                        <ContentSection
                            xmlData={item.data}
                            key={item.index}
                            titleIndex={item?.titleIndex}
                        />
                    ) : (
                        <></>
                    )
                )}
        </div>
    );
}
