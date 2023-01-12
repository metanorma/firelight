import React from 'react';
import Document, { DocumentType } from '../Document';

import './style.css';

const Main = () => {
    const data = [
        {
            type: 'ISO 17301-1:2016 (remote)',
            title: 'Cereals and pulses - Specifications and test methods—Rice (PRF)',
            stage: 'IS-60.60',
            isStandard: 'INTERNATIONAL-STANDARD',
            date: '2016-05-01',
            xml: 'https://metanorma.github.io/mn-samples-iso/documents/international-standard/rice-en.prf.xml'
        },
        {
            type: 'ISO 10303-2:2022 (local)',
            title: 'STEP - Vocabulary',
            stage: 'IS-60.60',
            isStandard: 'INTERNATIONAL-STANDARD',
            date: '2022-05-01',
            xml: '/iso-10303-2.xml'
        },
        {
            type: 'ITU-T TUT-CCIT-2015',
            title: 'Counterfeit ICT equipment',
            stage: 'IN-FORCE',
            isStandard: 'standard',
            date: '2015-12-11',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-CCIT-2015-E.xml'
        },
        {
            type: 'ITU-T TUT-L-2020-GLR',
            title: 'Guide on the use of ITU-T L-series Recommendations related to optical technologies for outside plant',
            stage: 'IN-FORCE',
            isStandard: 'standard',
            date: '2020-02-01',
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-L-2020-GLR.xml'
        },
        {
            type: 'OGC 15-104r5',
            title: 'OGC: Discrete Global Grid Systems Abstract Specification',
            stage: 'APPROVED',
            isStandard: 'standard',
            date: '2017-08-01',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/15-104r5/document.xml'
        },
        {
            type: 'OGC 12-077r1',
            title: 'OGC: A Primer for Dissemination Services for Wide Area Motion Imagery',
            stage: 'APPROVED',
            isStandard: 'standard',
            date: '2012-12-18',
            xml: 'https://metanorma.github.io/mn-samples-ogc/documents/12-077r1/document.xml'
        },
        {
            type: 'OGC 17-069',
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
