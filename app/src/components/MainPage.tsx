// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import { useXmlData } from '../context';
import ContentSection from './ContentSection';
import Cover from './Cover';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage() {
    const { xmlJson } = useXmlData();

    // split the xml data by content section and save those as array
    const contentSections = useMemo(() => {
        let index = 0;
        let count = 1;
        const getMenuItem = (data: any, hasIndex: boolean = false): any => {
            const returnData: any = {};
            // returnData.index = data['$']['displayorder'];
            returnData.index = index++;
            returnData.data = data;
            if (hasIndex) {
                returnData.titleIndex = count.toString();
                count++;
            }
            return returnData;
        };

        const menuItem: any[] = [];
        if (xmlJson['iso-standard']) {
            //the foreword part for menu item
            if (xmlJson['iso-standard']['preface']) {
                const foreword = getMenuItem(
                    xmlJson['iso-standard']['preface'][0]['foreword'][0]
                );
                menuItem[foreword.index] = foreword;
            }
            //the introduction part for menu item
            if (xmlJson['iso-standard']['preface']) {
                const introduction = getMenuItem(
                    xmlJson['iso-standard']['preface'][0]['introduction'][0]
                );
                menuItem[introduction.index] = introduction;
            }
            //the scopt part for menu
            if (xmlJson['iso-standard']['sections']) {
                const sectionItem = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['clause'][0],
                    true
                );
                menuItem[sectionItem.index] = sectionItem;
            }
            //the normative part for menu item
            if (xmlJson['iso-standard']['bibliography']) {
                const references = getMenuItem(
                    xmlJson['iso-standard']['bibliography'][0]['references'][0],
                    true
                );
                menuItem[references.index] = references;
            }
            //the terms part for menu item
            if (xmlJson['iso-standard']['sections']) {
                const terms = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['terms'][0],
                    true
                );
                menuItem[terms.index] = terms;
            }
            //the section part for menu item
            if (xmlJson['iso-standard']['sections']) {
                xmlJson['iso-standard']['sections'][0]['clause'].map(
                    (item: any, index: number) => {
                        if (index === 0) return;
                        const sectionItem = getMenuItem(item, true);
                        menuItem[sectionItem.index] = sectionItem;
                    }
                );
            }
            //the sction part for menu item
            if (xmlJson['iso-standard']['annex']) {
                const annex = xmlJson['iso-standard']['annex'];
                if (annex?.length) {
                    annex.map((sectoin: any) => {
                        const sectionItem = getMenuItem(sectoin);
                        menuItem[sectionItem.index] = sectionItem;
                        // menuItem.push(sectionItem)
                    });
                }
            }
            //the bibliography part
            if (xmlJson['iso-standard']['bibliography']) {
                const references = getMenuItem(
                    xmlJson['iso-standard']['bibliography'][0]['references'][1]
                );
                menuItem[references.index] = references;
            }
        }
        const resultArray: any[] = [];
        menuItem.map((item: any) => {
            if (item?.data) resultArray.push(item);
        });
        return resultArray;
    }, [xmlJson]);

    return (
        <div className="main-page">
            {/* <Cover /> */}
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
