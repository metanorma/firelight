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
    const [selectedItem, setSelectedItem] = useState<string>('');
    const menuItem = useMemo(() => {
        //verify the type of document.
        let standard = '';
        if (xmlJson['itu-standard']) {
            standard = 'itu-standard';
        } else if (xmlJson['iso-standard']) {
            standard = 'itu-standarad';
        }

        let index = 0;
        let count = 0;
        const insertSpace = (text: string): any => {
            const matches: any = text.match(/[a-zA-Z]+/g);
            const index: number = text.indexOf(matches[0]);
            return index
                ? text.substr(0, index) + '  ' + text.substr(index)
                : text;
        };

        const getMenuItem = (data: any, hasIndex: boolean = false): any => {
            const returnData: any = {};
            if (data?.references) {
                returnData.id = data.references[0]['$']['id'];
                returnData.index = index++;
                returnData.title = data.references[0]['title']['0'];
                returnData.children = [] ;
                return returnData; 
            }
            if (!data?.title) {
                return;
            }            
            // if (standard === 'iso-standard') {
            if (data?.$ && data['$']['id']) returnData.id = data['$']['id'];
            // returnData.index = data['$']['displayorder'];
            returnData.index = index++;
            returnData.title = insertSpace(
                typeof data['title'][0] === 'string'
                    ? data['title'][0]
                    : data['title'][0]['_']
            );
            if (
                returnData?.id &&
                returnData?.id.toLowerCase().includes('annex')
            ) {
                returnData.title =
                    returnData.id + ' (Normative) ' + returnData.title;
                hasIndex = false;
            }
            if (
                hasIndex &&
                returnData?.title &&
                returnData.title !== 'Foreword' &&
                returnData.title !== 'Introduction'
            ) {
                returnData.title = `${++count} ${returnData.title}`;
            }
            returnData.children = [];
            if (data?.clause?.length > 1) {
                data.clause.map((item: any, index: number) => {
                    const childItem: any = {};
                    childItem.id = item['$']['id'];
                    if (!item.title) return;
                    childItem.title = insertSpace(
                        typeof item['title'][0] === 'string'
                            ? item['title'][0]
                            : item['title'][0]['_']
                    );

                    let letter: string = '';
                    if (hasIndex) {
                        letter = count.toString();
                    } else if (
                        returnData?.id &&
                        returnData?.id.toLowerCase().includes('annex')
                    ) {
                        letter = returnData.id.substr(-1);
                    }

                    if (letter)
                        childItem.title = `${letter}.${index + 1} ${
                            childItem?.title ? childItem.title : ''
                        }`;
                    returnData.children[index] = childItem;
                });
            }

            return returnData;
        };

        const menuItem: any[] = [];

        if (xmlJson[standard]) {
            if (xmlJson[standard]['preface']) {
                //abstract
                if (xmlJson[standard]['preface'][0]['abstract']) {
                    xmlJson[standard]['preface'][0]['abstract'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                if (xmlJson[standard]['preface'][0]['introduction']) {
                    xmlJson[standard]['preface'][0]['introduction'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                if (xmlJson[standard]['preface'][0]['clause']) {
                    xmlJson[standard]['preface'][0]['clause'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                if (xmlJson[standard]['sections'][0]['clause']) {
                    xmlJson[standard]['sections'][0]['clause'].map(
                        (data: any) => {
                            const item = getMenuItem(data, true);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                if (xmlJson[standard]['annex']) {
                    xmlJson[standard]['annex'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                if (xmlJson[standard]['bibliography']) {
                    xmlJson[standard]['bibliography'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
            }
        }

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
