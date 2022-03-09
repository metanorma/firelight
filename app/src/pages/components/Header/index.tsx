import React from 'react';

import './style.css';

interface Props {
    generatedDate?: Date;
    type?: string;
    title?: string;
    version?: string;
}

const Header = ({ generatedDate, type, title, version }: Props) => {
    return (
        <header className="header">
            <div className="topbar-inner">
                <div className="title-bar">
                    <div className="doc-access">
                        {generatedDate
                            ? 'Generated: ' + generatedDate
                            : ''}
                        {version ? ' Metanorma ' + version : ''}
                    </div>
                    <span>
                        {type
                            ? type
                            : 'International Telecommunications Union'}
                    </span>
                </div>
            </div>
            <div className="title-section">
                <div className="coverpage">
                    <div className="wrapper-top1">
                        <div className="coverpage-doc-identity">
                            <div className="coverpage-title">
                                <span className="title-first">
                                    {title
                                        ? title
                                        : 'ITU Documents in Metanorma'}
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
