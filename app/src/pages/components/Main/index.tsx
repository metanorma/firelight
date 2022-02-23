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
