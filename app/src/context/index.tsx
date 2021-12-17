import React, { createContext, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import presentationData from '../data/presentation.xml';
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
    title: '',
};

export const XmlContext = createContext<XmlData>(contextDefaultValues);

const XmlProvider: React.FC = ({ children }) => {
    const [xml, setXml] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [xmlJson, setXmlJson] = useState<any>({});

    useEffect(() => {
        axios
            .get(presentationData, {
                headers: {
                    Accept: 'application/xml'
                }
            })
            .then((response) => {
                if (response.data) {
                    localStorage.setItem('xml', response.data);
                    setXml(response.data);

                    const xmlDoc = new DOMParser().parseFromString(
                        response.data,
                        'text/xml'
                    );

                    const bibdata: XMLNode =
                        xmlDoc.getElementsByTagName('bibdata')[0];
                    const childs = bibdata.childNodes;

                    const mainTitle: XMLNode | any = Object.values(childs).find(
                        (child: any) => {
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
                        }
                    );
                    setTitle(mainTitle?.childNodes[0].data);

                    parseString(response.data, {}, function (err, result) {
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
