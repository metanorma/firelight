// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from 'react';
import ContentSection from './ContentSection';
import { getTerminologies, getChildsByTagname } from '../utility';
import TermText from './TermText';
// import classnames from "classnames";
// import axios from 'axios';
// import datas from "../data/sidebar.json";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage({ xmlData }: OwnProps) {
    // split the xml data by content section and save those as array
    const contentSections = useMemo(() => {
        const getMenuItem = (data: any): any => {
            const returnData: any = {};
            returnData.index = data['$']['displayorder'];
            returnData.data = data;
            return returnData;
        };

        const menuItem: any[] = [];
        if (xmlData['bsi-standard']) {
            //the foreword part
            const foreword = getMenuItem(
                xmlData['bsi-standard']['preface'][0]['foreword'][0]
            );
            menuItem[foreword.index] = foreword;
            // menuItem.push(foreword);
            //the introduction part
            const introduction = getMenuItem(
                xmlData['bsi-standard']['preface'][0]['introduction'][0]
            );
            menuItem[introduction.index] = introduction;
            // menuItem.push(introduction);
            //the introduction part
            const references = getMenuItem(
                xmlData['bsi-standard']['bibliography'][0]['references'][0]
            );
            menuItem[references.index] = references;
            // menuItem.push(references);
            //the terms part
            const terms = getMenuItem(
                xmlData['bsi-standard']['sections'][0]['terms'][0]
            );
            menuItem[terms.index] = terms;
            // menuItem.push(terms)
            // the sction part
            const sections = xmlData["bsi-standard"]["sections"][0]["clause"];
            if (sections?.length) {
              sections.map((sectoin: any) => {
                const sectionItem = getMenuItem(sectoin);
                menuItem[sectionItem.index] = sectionItem;
                // menuItem.push(sectionItem);
              })
            }
            //the sction part
            const annex = xmlData["bsi-standard"]["annex"];
            if (annex?.length) {
              annex.map((sectoin: any) => {
                const sectionItem = getMenuItem(sectoin);
                menuItem[sectionItem.index] = sectionItem;
                // menuItem.push(sectionItem)
              })
            }
        }
        return menuItem;
    }, [xmlData]);

    return (
        <div className="main-page">
            {contentSections?.length > 0 && contentSections.map((item: any) => 
            <ContentSection xmlData={item.data} key={item.index}/>
        )}
            {/* <TermText text="aspect of corporate governance in which top management provides accurate and current information to stakeholders concerning the efficiency and effectiveness of its policies and operations, and the status of its compliance with statutory obligations" /> */}
        </div>
    );
}
