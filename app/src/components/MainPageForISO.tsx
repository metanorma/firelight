// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import { useXmlData } from '../context';
import ContentSection from './ContentSection';
import Cover from './Cover';

import { romanize } from '../utility';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlJson: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPageForITU({ xmlJson }: OwnProps) {
    // const { xmlJson, xml } = useXmlData();

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

        if (standard === 'iso-standard' && xmlJson['iso-standard']) {
            // //the foreword part for menu item
            // if (xmlJson['iso-standard']['preface']) {
            //     const foreword = getMenuItem(
            //         xmlJson['iso-standard']['preface'][0]['foreword'][0]
            //     );
            //     menuItem[foreword.index] = foreword;
            // }
            // //the introduction part for menu item
            // if (xmlJson['iso-standard']['preface']) {
            //     const introduction = getMenuItem(
            //         xmlJson['iso-standard']['preface'][0]['introduction'][0]
            //     );
            //     menuItem[introduction.index] = introduction;
            // }
            // //the scopt part for menu
            // if (xmlJson['iso-standard']['sections']) {
            //     const sectionItem = getMenuItem(
            //         xmlJson['iso-standard']['sections'][0]['clause'][0],
            //         true
            //     );
            //     menuItem[sectionItem.index] = sectionItem;
            // }
            // //the normative part for menu item
            // if (xmlJson['iso-standard']['bibliography']) {
            //     const references = getMenuItem(
            //         xmlJson['iso-standard']['bibliography'][0]['references'][0],
            //         true
            //     );
            //     menuItem[references.index] = references;
            // }
            //the terms part for menu item
            if (xmlJson['iso-standard']['sections']) {
                const terms = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['terms'][0],
                    true
                );
                menuItem[terms.index] = terms;
            }
            // //the section part for menu item
            // if (xmlJson['iso-standard']['sections']) {
            //     xmlJson['iso-standard']['sections'][0]['clause'].map(
            //         (item: any, index: number) => {
            //             if (index !== 0) {
            //                 const sectionItem = getMenuItem(item, true);
            //                 menuItem[sectionItem.index] = sectionItem;
            //             }
            //         }
            //     );
            // }
            // //the sction part for menu item
            // if (xmlJson['iso-standard']['annex']) {
            //     const annex = xmlJson['iso-standard']['annex'];
            //     if (annex?.length) {
            //         annex.map((sectoin: any) => {
            //             const sectionItem = getMenuItem(sectoin);
            //             menuItem[sectionItem.index] = sectionItem;
            //             // menuItem.push(sectionItem)
            //         });
            //     }
            // }
            // //the bibliography part
            // if (xmlJson['iso-standard']['bibliography']) {
            //     const references = getMenuItem(
            //         xmlJson['iso-standard']['bibliography'][0]['references'][1]
            //     );
            //     menuItem[references.index] = references;
            // }
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
