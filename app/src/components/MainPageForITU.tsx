// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import React, { useMemo, useState, useRef } from 'react';
import { useXmlData } from '../context';
import ContentSection from './ContentSection';
import Cover from './Cover';

import { getChildsByTagname, romanize } from '../utility';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function MainPageForITU() {
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
                } else{
                    //check whether the count is 3 or 4 and the value is available
                    if (standard === 'ogc-standard') {
                        if (count === 3) {
                            console.log(menuItem[roman + count -2], roman + count -2, index, '3')
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

        if (xmlJson[standard] && standard === 'itu-standard') {
            //Foreword
            if (xmlJson[standard]['boilerplate']) {
                if (xmlJson[standard]['boilerplate'][0]['legal-statement']) {
                    xmlJson[standard]['boilerplate'][0]['legal-statement'][0][
                        'clause'
                    ].map((data: any) => {
                        const item = getMenuItem(data);
                        if (item) menuItem[item.index] = item;
                    });
                }
            }

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
                //preface part
                if (xmlJson[standard]['preface'][0]['clause']) {
                    xmlJson[standard]['preface'][0]['clause'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
                }
                //sections part
                if (xmlJson[standard]['sections'][0]['clause']) {
                    xmlJson[standard]['sections'][0]['clause'].map(
                        (data: any) => {
                            const item = getMenuItem(data, true);
                            if (item) menuItem[item.index] = item;
                        }
                    );
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
                    xmlJson[standard]['annex'].map((data: any) => {
                        const item = getMenuItem(data);
                        if (item) menuItem[item.index] = item;
                    });
                }
                //bibliography part
                if (
                    xmlJson[standard]['bibliography'] &&
                    xmlJson[standard]['bibliography'][0]['references']
                ) {
                    xmlJson[standard]['bibliography'][0]['references'].map(
                        (data: any) => {
                            const item = getMenuItem(data);
                            if (item) menuItem[item.index] = item;
                        }
                    );
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
