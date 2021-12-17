// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo, useState } from 'react';
import { useXmlData } from '../context';
// import classnames from "classnames";
import NavItem from './NavItem';
// import axios from 'axios';

import './NavMenu.css';
// import datas from "../data/sidebar.json";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function NavIMenu({ xmlData }: OwnProps) {
    const { xmlJson } = useXmlData();
    const [selectedItem, setSelectedItem] = useState<number>(-1);
    const menuItem = useMemo(() => {
        const insertSpace = (text: string): any => {
            const matches: any = text.match(/[a-zA-Z]+/g);
            const index: number = text.indexOf(matches[0]);
            return index
                ? text.substr(0, index) + '  ' + text.substr(index)
                : text;
        };

        const getMenuItem = (data: any): any => {
            const returnData: any = {};
            returnData.id = data['$']['id'];
            returnData.index = data['$']['displayorder'];
            returnData.title = insertSpace(
                typeof data['title'][0] === 'string'
                    ? data['title'][0]
                    : data['title'][0]['_']
            );
            if (
                data['title'][0]['strong'] &&
                data['title'][0]['strong'].length > 0
            ) {
                returnData.title = `${data['title'][0]['strong'][0]} ${data['title'][0]['_']} ${data['title'][0]['strong'][1]}`;
            }
            returnData.children = [];
            if (data?.clause?.length > 1) {
                data.clause.map((item: any, index: number) => {
                    const childItem: any = {};
                    childItem.id = item['$']['id'];
                    childItem.title = insertSpace(
                        typeof item['title'][0] === 'string'
                            ? item['title'][0]
                            : item['title'][0]['_']
                    );
                    returnData.children[index] = childItem;
                });
            }
            return returnData;
        };

        const menuItem: any[] = [];
        if (xmlJson['bsi-standard']) {
            //the foreword part for menu item
            const foreword = getMenuItem(
                xmlJson['bsi-standard']['preface'][0]['foreword'][0]
            );
            menuItem[foreword.index] = foreword;
            // menuItem.push(foreword);
            //the introduction part for menu item
            const introduction = getMenuItem(
                xmlJson['bsi-standard']['preface'][0]['introduction'][0]
            );
            menuItem[introduction.index] = introduction;
            // menuItem.push(introduction);
            //the introduction part for menu item
            const references = getMenuItem(
                xmlJson['bsi-standard']['bibliography'][0]['references'][0]
            );
            menuItem[references.index] = references;
            // menuItem.push(references);
            //the terms part for menu item
            const terms = getMenuItem(
                xmlJson['bsi-standard']['sections'][0]['terms'][0]
            );
            menuItem[terms.index] = terms;
            // menuItem.push(terms)
            //the sction part for menu item
            const sections = xmlJson['bsi-standard']['sections'][0]['clause'];
            if (sections?.length) {
                sections.map((sectoin: any) => {
                    const sectionItem = getMenuItem(sectoin);
                    menuItem[sectionItem.index] = sectionItem;
                    // menuItem.push(sectionItem);
                });
            }
            //the sction part for menu item
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
            if (item?.title) resultArray.push(item);
        });
        return resultArray;
    }, [xmlJson]);

    return (
        <nav>
            <div id="toc">
                <ul>
                    {menuItem.map((item, index) => (
                        <NavItem
                            key={index}
                            index={index}
                            data={item}
                            active={selectedItem === item.id}
                            setSelectedItem={setSelectedItem}
                        />
                    ))}
                </ul>
            </div>
        </nav>
    );
}
