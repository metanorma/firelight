import React, { createContext, useEffect, useState, useContext } from 'react';
import axios from 'axios';
import presentationData from './data/presentation.xml';
import { parseString } from 'xml2js';

export type XmlData = {
    xml: string;
};

const contextDefaultValues: XmlData = {
    xml: ''
};

export const XmlContext = createContext<XmlData>(contextDefaultValues);

const XmlProvider: React.FC = ({ children }) => {
    const [xmlData, setXmlData] = useState<string>('');

    useEffect(() => {
        axios
            .get(presentationData, {
                headers: {
                    Accept: 'application/xml'
                }
            })
            .then((response) => {
                parseString(response.data, {}, function (err, result) {
                    setXmlData(result);
                });
            });
    }, []);

    return (
        <XmlContext.Provider value={{ xml: xmlData }}>
            {children}
        </XmlContext.Provider>
    );
};

export default XmlProvider;

const useXmlData = (): XmlData => {
  const context = useContext(XmlContext);
  if (context === undefined) {
    throw new Error('Xml data is not loaded!');
  }
  return context;
};
