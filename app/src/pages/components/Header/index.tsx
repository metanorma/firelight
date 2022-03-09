import React from 'react';
import { useXmlData } from '../../../context';

import './style.css';

const Header = () => {
    const { documentDetail } = useXmlData();

    return (
        <header className="header">
            <div className="topbar-inner">
                <div className="title-bar">
                    <div className="doc-access">
                        {documentDetail?.generateDate ? 'Generated: ' + documentDetail?.generateDate : ''}
                        {documentDetail?.version ? ' Metanorma ' + documentDetail?.version : ''}
                    </div>
                    <span>{documentDetail?.type ? documentDetail?.type : 'Metanorma'}</span>
                </div>
            </div>
            <div className="title-section">
                <div className="coverpage">
                    <div className="wrapper-top1">
                        <div className="coverpage-doc-identity">
                            <div className="coverpage-title">
                                <span className="title-first">
                                    {documentDetail?.title ? documentDetail?.title : 'Metanorma Documents'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
