import React from 'react';
import Document, { DocumentType } from '../Document';

import './style.css';

const Main = () => {
    const data = [
        {
            type: '1',
            title: 'Rules of procedure of the ITU Telecommunica',
            stage: 'IN-FORCE',
            isStandard: true,
            xml: 'https://metanorma.github.io/mn-samples-itu/documents/T-TUT-CCIT-2015-E.xml'
        },
        {
            type: '1',
            title: 'Rules of procedure of the ITU Telecommunica',
            stage: 'IN-FORCE',
            isStandard: true,
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
