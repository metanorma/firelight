import React, { createContext, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { parseString } from 'xml2js';
import { XMLNode } from '../components/DisplayNode';

export type XmlData = {
    xml: string;
    xmlJson: any;
    title: string;
};

const contextDefaultValues: XmlData = {
    xml: '',
    xmlJson: {},
    title: ''
};

export const XmlContext = createContext<XmlData>(contextDefaultValues);

// const xmlUrl = "/presentation.xml";
// const xmlUrl = "https://metanorma.github.io/mn-samples-iso/documents/international-workshop-agreement/document.xml";
// const xmlUrl = "/iso.xml";
// const xmlUrl = "https://metanorma.github.io/mn-samples-iso/documents/international-standard/rice-en.wd.xml";
const xmlUrl0 = '/rice.xml';
const xmlUrl =
    'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-CCIT-2015-E.xml';
const localXmlUrl = '/a2015.xml';
const xmlUrl1 =
    'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-L-2020-GLR.xml';
const localXmlUrl1 = '/2020.xml';
const xmlUrl2 =
    'https://metanorma.github.io/mn-samples-itu/documents/T-REC-A.8-200810-I!!MSW-E.xml';
const localXmlUrl2 = '/2008.xml';
const ogcUrl =
    'https://metanorma.github.io/mn-samples-ogc/documents/12-077r1/document.xml';

const XmlProvider: React.FC = ({ children }) => {
    const [xml, setXml] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [xmlJson, setXmlJson] = useState<any>({});

    useEffect(() => {
        axios
            .get(ogcUrl, {
                headers: {
                    Accept: 'application/xml'
                }
            })
            .then((response) => {
                console.log(response.data, 'xml');
                if (response.data) {
                    localStorage.setItem('xml', response.data);
                    setXml(response.data);

                    const xmlDoc = new DOMParser().parseFromString(
                        response.data,
                        'application/xml'
                    );

                    const bibdata: XMLNode =
                        xmlDoc.getElementsByTagName('bibdata')[0];
                    if (bibdata?.childNodes) {
                        const childs = bibdata.childNodes;

                        const mainTitle: XMLNode | any = Object.values(
                            childs
                        ).find((child: any) => {
                            if (child.tagName === 'title') {
                                let attrs = child.attributes;
                                let result = false;
                                Object.values(attrs).map((attr: any) => {
                                    if (
                                        attr.name === 'type' &&
                                        attr.value === 'main'
                                    ) {
                                        result = true;
                                    }
                                });
                                return result;
                            } else {
                                return;
                            }
                        });

                        if (mainTitle) setTitle(mainTitle?.childNodes[0].data);
                        else {
                            let mainTitle: XMLNode | any = Object.values(
                                childs
                            ).find((child: any) => child?.tagName === 'title');
                            if (mainTitle) setTitle(mainTitle?.childNodes[0].data);
                        }
                    } else {
                        setTitle('');
                    }

                    parseString(response.data, {}, function (err, result) {
                        console.log(result, 'jsonXml');
                        setXmlJson(result);
                    });
                }
            });
    }, []);

    return (
        <XmlContext.Provider value={{ xml, xmlJson, title }}>
            {children}
        </XmlContext.Provider>
    );
};

export default XmlProvider;

export const useXmlData = (): XmlData => {
    const context = useContext(XmlContext);
    if (context === undefined) {
        throw new Error('Xml data is not loaded!');
    }
    return context;
};
