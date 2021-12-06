// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import ContentSection from "./ContentSection";
import { getChildsById } from "../utility";
// import classnames from "classnames";
// import axios from 'axios';
// import datas from "../data/sidebar.json";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPage({ xmlData }: OwnProps) {
console.log(getChildsById("_5107463c-5acc-19df-d5f3-5693e3174eb7"), 'child1');
console.log(getChildsById("sec_0.4"), 'child2');
// console.log(getChildsById("sec_foreword")?.childNodes[0], 'child3');
  // split the xml data by content section and save those as array
  const contentSections = useMemo(() => {

    const getMenuItem = (data: any): any => {
      const returnData: any = {};
      returnData.index = data["$"]["displayorder"];
      returnData.data = data;
      return returnData;
    };

    const menuItem: any[] = [];
    if (xmlData["bsi-standard"]) {
      //the foreword part 
      const foreword = getMenuItem(xmlData["bsi-standard"]["preface"][0]["foreword"][0]);
      menuItem[foreword.index] = foreword;
      // menuItem.push(foreword);
      //the introduction part 
      const introduction = getMenuItem(xmlData["bsi-standard"]["preface"][0]["introduction"][0]);
      menuItem[introduction.index] = introduction;
      // menuItem.push(introduction);
      //the introduction part 
      const references = getMenuItem(xmlData["bsi-standard"]["bibliography"][0]["references"][0]);
      menuItem[references.index] = references;
      // menuItem.push(references);
      //the terms part 
      const terms = getMenuItem(xmlData["bsi-standard"]["sections"][0]["terms"][0]);
      menuItem[terms.index] = terms;
      // menuItem.push(terms)
      //the sction part 
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
    </div>
  );
}
