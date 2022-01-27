import React from 'react';

import './style.css';

interface DocumentType {
    type?: string;
    title?: string;
    stage?: string;
    isStandard?: boolean;
}

const Document = ({ type, title, stage, isStandard }: DocumentType) => {
    return (
        <div className="document">
            <div className="doc-line">
                <div className="doc-identifier1">
                    <h2>
                        <a href="documents/T-RES-T.1-2016-MSW-E.html">
                            ITU-T {type}
                        </a>
                    </h2>
                </div>

                <div className="doc-type-wrap">
                    <div className="doc-type1 standard">standard</div>
                </div>
            </div>
            <div className="doc-title">
                <h3>
                    <a href="documents/T-RES-T.1-2016-MSW-E.html">{title}</a>
                </h3>
            </div>
            <div className="doc-info-container">
                <div className="doc-info in-force">
                    <div className="doc-stage in-force">{stage}</div>
                    <div className="doc-dates">
                        <div className="doc-updated"></div>
                    </div>
                </div>
                <div className="doc-info-content">
                    <div className="doc-access1">
                        <div className="doc-access-button-html">
                            <a href="documents/T-RES-T.1-2016-MSW-E.html">
                                HTML
                            </a>
                        </div>

                        <div className="doc-access-button-pdf">
                            <a href="documents/T-RES-T.1-2016-MSW-E.pdf">PDF</a>
                        </div>

                        <div className="doc-access-button-doc">
                            <a href="documents/T-RES-T.1-2016-MSW-E.doc">
                                Word
                            </a>
                        </div>

                        <div className="doc-access-button-xml">
                            <a href="documents/T-RES-T.1-2016-MSW-E.xml">XML</a>
                        </div>
                    </div>
                    <div className="doc-bib1">
                        <div className="doc-bib-relaton">
                            <a href="documents/T-RES-T.1-2016-MSW-E.rxl">
                                Relaton XML
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Document;
