import React from 'react';
import Document, { DocumentType } from '../Document';

import './style.css';

const Main = () => {
    const data = [
        {
            type: '1',
            title: 'Counterfeit ICT equipment',
            stage: 'IN-FORCE',
            isStandard: true,
            date: '2015-12-11',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-CCIT-2015-E.xml'
        },
        {
            type: '1',
            title: 'Guide on the use of ITU-T L-series Recommendations related to optical technologies for outside plant',
            stage: 'IN-FORCE',
            isStandard: true,
            date: '2020-02-01',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-L-2020-GLR.xml'
        },
        {
            type: '1',
            title: 'Guide on c 21: Discrete Global Grid Systems Abstract Specification',
            stage: 'APPROVED',
            isStandard: true,
            date: '2017-08-01',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/15-104r5/document.xml'
        },
        {
            type: '1',
            title: 'A Primer for Dissemination Services for Wide Area Motion Imagery',
            stage: 'APPROVED',
            isStandard: true,
            date: '2012-12-18',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/12-077r1/document.xml'
        }
    ];

    return (
        <main className="main-section">
            {data?.map((child: DocumentType, index: number) => (
                <Document key={index} {...child} />
            ))}
        </main>
    );
};

export default Main;
