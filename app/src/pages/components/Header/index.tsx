import React from 'react';

import './style.css';

interface Props {
    generatedDate?: Date;
    companyName?: string;
    title?: string;
}

const Header = ({ generatedDate, companyName, title }: Props) => {
    return (
        <header className="header">
            <div className="topbar-inner">
                <div className="title-bar">
                    <div className="doc-access">
                        {generatedDate
                            ? generatedDate
                            : 'Generated: 2021-06-29 Metanorma 1.3.5'}
                    </div>
                    <span>
                        {companyName
                            ? companyName
                            : 'International Telecommunications Union'}
                    </span>
                </div>
            </div>
            <div className="title-section">
                <div className="coverpage">
                    <div className="wrapper-top">
                        <div className="coverpage-doc-identity">
                            <div className="coverpage-title">
                                <span className="title-first">
                                    {title
                                        ? title
                                        : 'International Telecommunications Union'}
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
