import React, { createContext, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { parseString } from 'xml2js';
import { XMLNode } from '../components/DisplayNode';

export type XmlData = {
    xml: string;
    xmlJson: any;
    title: string;
    figureIndex: number;
    setFigureIndex: (a: number) => void;
    standard: string;
    sourceUrl: string;
    setSourceUrl: (a: string) => void;
    loading: boolean;
    setLoading: (a: boolean) => void;
};

const contextDefaultValues: XmlData = {
    xml: '',
    xmlJson: {},
    title: '',
    figureIndex: 0,
    setFigureIndex: (a: number) => {},
    standard: '',
    sourceUrl: '',
    setSourceUrl: (a: string) => {},
    loading: true,
    setLoading: (a: boolean) => {}
};

export const XmlContext = createContext<XmlData>({} as XmlData);

const XmlProvider: React.FC = ({ children }) => {
    const [xml, setXml] = useState<string>('');
    const [title, setTitle] = useState<string>('');
    const [xmlJson, setXmlJson] = useState<any>({});
    const [figureIndex, setFigureIndex] = useState<number>(0);
    const [standard, setStandard] = useState<string>('iso-standard');
    const [sourceUrl, setSourceUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!sourceUrl) {
            return;
        }

        axios
            .get(sourceUrl, {
                headers: {
                    Accept: 'application/xml'                                                                                           
                }
            })
            .then((response) => {
                if (response.data) {
                    localStorage.clear();
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
                            if (mainTitle)
                                setTitle(mainTitle?.childNodes[0].data);
                        }
                    } else {
                        setTitle('');
                    }

                    parseString(response.data, {}, function (err, result) {
                        setXmlJson(result);
                        if (result['iso-standard']) setStandard('iso-standard');
                        else if (result['itu-standard']) setStandard('itu-standard');
                        else if (result['ogc-standard']) setStandard('ogc-standard');
                    });

                    // set the index of figure to zero.
                    localStorage.setItem('figure', '0');
                    localStorage.setItem('id', '');
                }
                setLoading(true);
            });
            // set the index of figure to zero.
            localStorage.setItem('figure', '0');
            localStorage.setItem('id', '');
    }, [sourceUrl]);

    return (
        <XmlContext.Provider
            value={{ xml, xmlJson, title, figureIndex, setFigureIndex, standard, sourceUrl, setSourceUrl, loading, setLoading }}
        >
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
