import React from 'react';
import Document, { DocumentType } from '../Document';

import './style.css';

const Main = () => {
    const data = [
        {
            type: 'ISO 17301-1:2016',
            title: 'Ceals and pulses - Specifications and test methods—Rice (PRF)',
            stage: 'IS-60.60',
            isStandard: 'INTERNATIONAL-STANDARD',
            date: '2016-05-01',
            xml: 'https://metanorma.github.io/mn-samples-iso/documents/international-standard/rice-en.prf.xml'
        },
        {
            type: 'ISO 17301-1:2016',
            title: 'Ceals and pulses - Specifications and test methods—Rice (Final)',
            stage: 'IS-60.60',
            isStandard: 'INTERNATIONAL-STANDARD',
            date: '2016-05-01',
            xml: 'https://metanorma.github.io/mn-samples-iso/documents/international-standard/rice-en.final.xml'
        },
        {
            type: 'ITU-T 1',
            title: 'Counterfeit ICT equipment',
            stage: 'IN-FORCE',
            isStandard: 'standard',
            date: '2015-12-11',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-CCIT-2015-E.xml'
        },
        {
            type: 'ITU-T 1',
            title: 'Guide on the use of ITU-T L-series Recommendations related to optical technologies for outside plant',
            stage: 'IN-FORCE',
            isStandard: 'standard',
            date: '2020-02-01',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-L-2020-GLR.xml'
        },
        {
            type: 'ITU-T 1',
            title: 'Guide on c 21: Discrete Global Grid Systems Abstract Specification',
            stage: 'APPROVED',
            isStandard: 'standard',
            date: '2017-08-01',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/15-104r5/document.xml'
        },
        {
            type: 'ITU-T 1',
            title: 'A Primer for Dissemination Services for Wide Area Motion Imagery',
            stage: 'APPROVED',
            isStandard: 'standard',
            date: '2012-12-18',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/12-077r1/document.xml'
        },
        {
            type: '17-069',
            title: 'OGC Web Feature Service 3.0: Part 1 - Core',
            stage: 'CANDIDATE',
            isStandard: 'standard',
            date: '2018-04-07',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/repos/ogc-wfs/core/standard/17-069.xml'
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
