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
        const getMenuItem = (data: any): any => {
            const returnData: any = {};
            returnData.index = data['$']['displayorder'];
            returnData.data = data;
            return returnData;
        };

        const menuItem: any[] = [];
        if (xmlJson['bsi-standard']) {
            //the foreword part
            const foreword = getMenuItem(
                xmlJson['bsi-standard']['preface'][0]['foreword'][0]
            );
            menuItem[foreword.index] = foreword;
            // menuItem.push(foreword);
            //the introduction part
            const introduction = getMenuItem(
                xmlJson['bsi-standard']['preface'][0]['introduction'][0]
            );
            menuItem[introduction.index] = introduction;
            // menuItem.push(introduction);
            //the introduction part
            const references = getMenuItem(
                xmlJson['bsi-standard']['bibliography'][0]['references'][0]
            );
            menuItem[references.index] = references;
            // menuItem.push(references);
            //the terms part
            const terms = getMenuItem(
                xmlJson['bsi-standard']['sections'][0]['terms'][0]
            );
            menuItem[terms.index] = terms;
            // menuItem.push(terms)
            // the sction part
            const sections = xmlJson['bsi-standard']['sections'][0]['clause'];
            if (sections?.length) {
                sections.map((sectoin: any) => {
                    const sectionItem = getMenuItem(sectoin);
                    menuItem[sectionItem.index] = sectionItem;
                    // menuItem.push(sectionItem);
                });
            }
            //the sction part
            const annex = xmlJson['bsi-standard']['annex'];
            if (annex?.length) {
                annex.map((sectoin: any) => {
                    const sectionItem = getMenuItem(sectoin);
                    menuItem[sectionItem.index] = sectionItem;
                    // menuItem.push(sectionItem)
                });
            }
            //the bibliography part
            const bibliography = getMenuItem(
                xmlJson['bsi-standard']['bibliography'][0]['clause'][0]
            );
            menuItem[bibliography.index] = bibliography;
        }
        const resultArray: any[] = [];
        menuItem.map((item: any) => {
            if (item?.data) resultArray.push(item);
        });
        return resultArray;
    }, [xmlJson]);
console.log(xmlJson, 'xmlJson')
    return (
        <div className="main-page">
            {/* <Cover /> */}
            {contentSections?.length > 0 &&
                contentSections.map((item: any) =>
                    item?.data ? (
                        <ContentSection xmlData={item.data} key={item.index} />
                    ) : (
                        <></>
                    )
                )}
        </div>
    );
}
