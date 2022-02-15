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
        } else if (xmlJson['ogc-standard']) {
            standard = 'ogc-standard';
        }

        let index = 0;
        let count = 0;
        let annexCount = 65;
        let roman = 1;

        const insertSpace = (text: string): any => {
            const matches: any = text.match(/[a-zA-Z]+/g);
            const index: number = text.indexOf(matches[0]);
            return index
                ? text.substr(0, index) + '  ' + text.substr(index)
                : text;
        };

        const romanize = (num: number) => {
            let lookup: any = {
                M: 1000,
                CM: 900,
                D: 500,
                CD: 400,
                C: 100,
                XC: 90,
                L: 50,
                XL: 40,
                X: 10,
                IX: 9,
                V: 5,
                IV: 4,
                I: 1
            };
            let roman: string = '';
            let i: string = '';
            for (let i in lookup) {
                while (num >= lookup[i]) {
                    roman += i;
                    num -= lookup[i];
                }
            }
            return roman;
        };

        const getMenuItem = (data: any, hasIndex: boolean | number = false, hasRoman: boolean = false, isAnnex: boolean = false): any => {
            const returnData: any = {};
            if (data?.references) {
                returnData.id = data.references[0]['$']['id'];
                returnData.index = index++;
                returnData.title = data.references[0]['title']['0'];
                returnData.children = [];
                return returnData;
            }
            if (!data?.title) {
                return;
            }

            if (hasIndex) {
                if (typeof hasIndex === 'number') {
                    returnData.index = roman + hasIndex - 1;
                } else {
                    if (count === 2 && menuItem[roman + count] !== undefined) {
                        count ++;
                        index ++;
                        
                    }
                    if (count === 3 && menuItem[roman + count ] !== undefined) {
                        count ++;
                        index ++;
                    }
                    returnData.index = index ++;
                    count ++;
                }
            } else {
                returnData.index = index++;
            }

            // if (standard === 'iso-standard') {
            if (data?.$ && data['$']['id']) returnData.id = data['$']['id'];

            
            returnData.title = insertSpace(
                typeof data['title'][0] === 'string'
                    ? data['title'][0]
                    : data['title'][0]['_']
            );

            if (
                returnData?.id &&
                returnData?.id.toLowerCase().includes('annex')
            ) {
                if (standard === 'ogc-standard') {
                    returnData.title =
                        'Annex' +
                        String.fromCharCode(annexCount++) +
                        ' (Normative) ' +
                        returnData.title;
                } else {
                    returnData.title =
                        returnData.id + ' (Normative) ' + returnData.title;
                    hasIndex = false;
                }
            }

            if (
                hasIndex &&
                returnData?.title &&
                returnData.title !== 'Foreword' &&
                returnData.title !== 'Introduction'
            ) { 
                if (typeof hasIndex === 'number') {
                    returnData.title = `${hasIndex} ${returnData.title}`;
                } else {
                    returnData.title = `${count} ${returnData.title}`;
                }
                    
            }

            if (
                standard === 'ogc-standard' &&
                hasIndex &&
                returnData?.title === 'Introduction'
            ) {
                returnData.title = `${count} ${returnData.title}`;
            }

            returnData.children = [];
            if (data?.clause?.length > 0) {
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
                        if (standard === 'ogc-standard') {
                            letter = String.fromCharCode(annexCount - 1);
                        }
                    } else if (isAnnex) {
                        letter = String.fromCharCode(annexCount);
                    }

                    if (letter)
                        childItem.title = `${letter}.${index + 1} ${
                            childItem?.title ? childItem.title : ''
                        }`;
                    returnData.children[index] = childItem;
                });
            }

            if (hasRoman) {
                returnData.title = romanize(roman ++) + ". " + returnData.title;
            }

            if (isAnnex) {
                returnData.title = 'Annex ' + String.fromCharCode(annexCount ++) + ' (Normative) ' + returnData.title;
            }

            return returnData;
        };

        const menuItem: any[] = [];

        if (standard === 'itu-standard' && xmlJson[standard]) {
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
                    xmlJson[standard]['annex'].map((data: any) => {
                        const item = getMenuItem(data);
                        if (item) menuItem[item.index] = item;
                    });
                }
                if (xmlJson[standard]['bibliography']) {
                    xmlJson[standard]['bibliography'].map((data: any) => {
                        const item = getMenuItem(data);
                        if (item) menuItem[item.index] = item;
                    });
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

        if (standard === 'ogc-standard' && xmlJson[standard]) {
            if (xmlJson[standard]['preface']) {
                if (xmlJson[standard]['preface'][0]?.clause) {
                    //abstract part
                    if (xmlJson[standard]['preface'][0]?.abstract) {
                        const abstract = getMenuItem(
                            xmlJson[standard]['preface'][0].abstract[0], false, true
                        );
                        menuItem[abstract.index] = abstract;
                    }

                    //keywords part
                    if (xmlJson[standard]['bibdata'][0]?.keyword) {
                        if (
                            xmlJson[standard]['bibdata'][0]?.keyword?.length > 0
                        ) {
                            const keywords =
                                xmlJson[standard]['bibdata'][0]?.keyword.join(
                                    ' '
                                );
                            let data = {
                                id: '_keywords',
                                index: index++,
                                title: romanize(roman ++) + '. Keywords',
                                children: []
                            };
                            menuItem[data.index] = data;
                        }
                    }

                    //preface part(foreword)
                    if (xmlJson[standard]['preface'][0]?.foreword) {
                        const foreword = getMenuItem(
                            xmlJson[standard]['preface'][0].foreword[0], false, true
                        );
                        menuItem[foreword.index] = foreword;
                    }

                    //security considerations
                    xmlJson[standard]['preface'][0]?.clause.map(
                        (child: any) => {
                            if (
                                child?.title &&
                                child.title[0] &&
                                child.title[0].toLowerCase() ===
                                    'Security considerations'.toLocaleLowerCase()
                            ) {
                                const consideration = getMenuItem(child, false, true);
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
                                const consideration = getMenuItem(child, false, true);
                                menuItem[consideration.index] = consideration;
                            }
                        }
                    );
                }
            }

            //submitting organizations
            if (xmlJson[standard]['bibdata'][0]?.contributor) {

                if (xmlJson[standard]['bibdata'][0]?.contributor?.length > 0) {
                    let data = {
                        id: '_organizations',
                        index: index++,
                        title: romanize(roman) + '. Organizations',
                        children: []
                    };
                    menuItem[data.index] = data;
                }
            }

            //submission part
            if (xmlJson[standard]['preface']) {
                if (xmlJson[standard]['preface'][0]?.submitters) {
                    const submitters = getMenuItem(
                        xmlJson[standard]['preface'][0].submitters[0], false, true
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
                            const introduction = getMenuItem(child, false, true);
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
                            const referenceNotes = getMenuItem(child, false, true);
                            menuItem[referenceNotes.index] = referenceNotes;
                        }
                    }
                );
            }
            //Normative References
            if (xmlJson[standard]['bibliography']) {
                const normativeRow = Object.values(
                    xmlJson[standard]['bibliography'][0]['references']
                ).find(
                    (child: any) => {
                        if (child?.title[0].toLowerCase() === 'Normative references'.toLocaleLowerCase())
                            return true;
                        return false;
                    }
                );
                
                let normaitveReferences = getMenuItem(normativeRow, 3);
                menuItem[normaitveReferences.index] = normaitveReferences;
            }

            // terms and definitions
            if (xmlJson[standard]['sections']) {
                if (xmlJson[standard]['sections'][0]?.terms) {
                    let terms = getMenuItem(xmlJson[standard]['sections'][0]?.terms[0], 4);
                    menuItem[terms.index] = terms;
                }
            }


            //sections part
            if (xmlJson[standard]['sections']) { console.log(xmlJson[standard]['sections'], 'clauses')
                if (xmlJson[standard]['sections'][0]?.clause) {
                    xmlJson[standard]['sections'][0].clause.map(
                        (child: any) => {
                            let item = getMenuItem(child, true);
                            menuItem[item.index] = item;
                        }
                    );
                }
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
                menuItem[bibliographyReferences.index] = bibliographyReferences;
            }
        }
console.log(menuItem, 'menuItem');
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
