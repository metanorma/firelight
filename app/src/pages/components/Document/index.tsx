import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useXmlData } from '../../../context';

import './style.css';

export interface DocumentType {
    type?: string;
    title?: string;
    stage?: string;
    isStandard?: boolean;
    html?: string;
    pdf?: string;
    word?: string;
    xmlRelation?: string;
    xml?: string;
    date?: string;
}

const Document = ({
    type,
    title,
    stage,
    isStandard,
    date,
    html,
    pdf,
    word,
    xmlRelation,
    xml
}: DocumentType) => {
    const { setSourceUrl, setLoading } = useXmlData();
    const navigate = useNavigate();

    const handleClick = () => {
        if (xml) {
            setLoading(false);
            setSourceUrl(xml);
            navigate("/app");
        }
    };

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
                    <a onClick={e => handleClick()}>{title}</a>
                </h3>
            </div>
            <div className="doc-info-container">
                <div className="doc-info in-force">
                    <div className="doc-stage in-force">{stage}</div>
                    <div className="doc-dates">
                        <div className="doc-updated">{date}</div>
                    </div>
                </div>
                <div className="doc-info-content">
                    <div className="doc-access1">
                        <div
                            className="doc-access-button-html"
                            onClick={() => handleClick()}
                        >
                            <a>HTML</a>
                        </div>

                        <div className="doc-access-button-pdf">
                            <a href={pdf ? pdf : ''}>PDF</a>
                        </div>

                        <div className="doc-access-button-doc">
                            <a href={pdf ? pdf : ''}>Word</a>
                        </div>

                        <div className="doc-access-button-xml">
                            <a href={xml ? xml : ''}>XML</a>
                        </div>
                    </div>
                    <div className="doc-bib1">
                        <div className="doc-bib-relaton">
                            <a href={xmlRelation ? xmlRelation : ''}>
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
