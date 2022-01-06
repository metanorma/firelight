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

export default function NavIMenu() {
    const { xmlJson } = useXmlData();
    console.log('xmlJson', xmlJson);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const menuItem = useMemo(() => {
        let index = 0;
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
            // returnData.index = data['$']['displayorder'];
            returnData.index = index++;
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
            if (xmlJson['iso-standard']['sections'] ) {
                const sectionItem = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['clause'][0]
                );
                menuItem[sectionItem.index] = sectionItem;
            }
            //the normative part for menu item
            if (xmlJson['iso-standard']['bibliography']) {
                const references = getMenuItem(
                    xmlJson['iso-standard']['bibliography'][0]['references'][0]
                );
                menuItem[references.index] = references;
            }
            //the terms part for menu item
            if (xmlJson['iso-standard']['sections']) {
                const terms = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['terms'][0]
                );
                menuItem[terms.index] = terms;
            }
            //the section part for menu item
            if (xmlJson['iso-standard']['sections'] ) {
                const sectionItem = getMenuItem(
                    xmlJson['iso-standard']['sections'][0]['clause'][1]
                );
                menuItem[sectionItem.index] = sectionItem;
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
        return menuItem;
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
