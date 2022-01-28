import React from 'react';
import Document from '../Document';

import './style.css';

interface DocumentType {
    type?: string;
    title?: string;
    stage?: string;
    isStandard?: boolean;
}

const Main = () => {
    const data = [
        {
            type: '1',
            title: 'Rules of procedure of the ITU Telecommunica',
            stage: 'IN-FORCE',
            isStandard: true
        },
        {
            type: '1',
            title: 'Rules of procedure of the ITU Telecommunica',
            stage: 'IN-FORCE',
            isStandard: true
        }
    ];
    return <main className="main-section">
        {data?.map(
            (child: DocumentType) => <Document {...child}/>
        )}
    </main>;
};

export default Main;
