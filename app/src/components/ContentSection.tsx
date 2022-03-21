// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getChildsById } from '../utility';
import DisplayNode from './DisplayNode';
import SectionTerm from './SectionTerm';
import './ContentSection.css';

import { useXmlData } from '../context';
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
    titleIndex?: string | any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData, titleIndex }: OwnProps) {
    const { xml } = useXmlData();

    const renderContent = useMemo(() => {
        const id = xmlData?.$?.id ? xmlData.$.id : '';
        let node: any = '';
        if (!id) {
            if (xmlData?.title && xmlData.title[0]) {
                let title = xmlData.title[0];

                return (
                    <div className="cotent-section">
                        <h1 className="title title-3">
                            {xmlData?.romanNum ? xmlData?.romanNum + '. ' : ''}
                            {title}
                        </h1>
                        {xmlData?.p?.length &&
                            xmlData.p.map((data: any) => (
                                <div className="p" id={data?.$?.id}>
                                    {data?._}
                                </div>
                            ))}
                    </div>
                );
            }
        }

        node = getChildsById(id, xml);

        if (xmlData?.id && xmlData.id === '_keywords') {
            // console.log(xmlData, 'xmlData');
            return (
                <div className="content-section" id={xmlData?.id}>
                    <h1 className="title title-3">
                        {xmlData?.romanNum ? xmlData?.romanNum + '. ' : ''}
                        Keywords
                    </h1>
                    {xmlData?.p?.map((child: any) => (
                        <div className="p">{child}</div>
                    ))}
                </div>
            );
        }

        if (xmlData?.id && xmlData.id === '_organizations') {
            // console.log(xmlData, 'xmlData');
            return (
                <div className="content-section" id={xmlData?.id}>
                    <h1 className="title title-3">
                        {xmlData?.romanNum ? xmlData?.romanNum + '. ' : ''}
                        SUBMITTING ORGANIZATIONS
                    </h1>
                    <div className="p">{xmlData?.p ? xmlData?.p : ''}</div>
                    <ul className="organization">
                        {xmlData?.organizations &&
                            xmlData?.organizations.map(
                                (child: string, index: number) => (
                                    <li key={index}>{child}</li>
                                )
                            )}
                    </ul>
                </div>
            );
        }

        if (xmlData?.romanNum) {
            let title = xmlData.romanNum + '. ';

            if (xmlData?.title && xmlData?.title[0]) {
                if (typeof xmlData.title[0] !== 'object')
                    title = `${title} ${xmlData?.title[0]}`;
                else {
                    if (xmlData.title[0]?._) {
                        title = `${title} ${xmlData?.title[0]._}`;
                    }

                    if (xmlData.title[0]?.em) {
                        title = `${title} ${xmlData?.title[0].em[0]}`;
                    }
                }
            }

            if (node) {
                Object.values(node?.childNodes).map(
                    (child: any, index: number) => {
                        if (child?.tagName === 'title')
                            delete node.childNodes[index];
                    }
                );
                return (
                    <div className="content-section" id={id}>
                        <h1 className="title title-3">{title}</h1>
                        <DisplayNode data={node.childNodes} />
                        {xmlData?.clause?.length > 0 &&
                            xmlData.clause.map((child: any, index: number) => (
                                <ContentSection
                                    key={index}
                                    xmlData={child}
                                    titleIndex={`${titleIndex}.${index + 1}`}
                                />
                            ))}
                    </div>
                );
            }
            // }
        }

        if (!titleIndex) {
            if (id && id.toLowerCase().includes('annex')) {
                let title = id + ' (Normative) ' + xmlData.title[0];
                let letter = id.substr(5);
                if (node) {
                    Object.values(node?.childNodes).map(
                        (child: any, index: number) => {
                            if (child?.tagName === 'title')
                                delete node.childNodes[index];
                        }
                    );
                    return (
                        <div className="content-section" id={id}>
                            <h1 className="title title-3">{title}</h1>
                            <DisplayNode data={node.childNodes} />
                            {xmlData?.clause?.length > 0 &&
                                xmlData.clause.map(
                                    (child: any, index: number) => (
                                        <ContentSection
                                            key={index}
                                            xmlData={child}
                                            titleIndex={`${letter}.${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                        </div>
                    );
                }
            }
            return node ? (
                <div className="content-section" id={id}>
                    <DisplayNode data={node.childNodes} />
                    {xmlData?.clause?.length > 0 &&
                        xmlData.clause.map((child: any, index: number) => (
                            <ContentSection key={index} xmlData={child} />
                        ))}
                </div>
            ) : (
                <>
                    {xmlData?.clause?.length > 0 &&
                        xmlData.clause.map((child: any, index: number) => (
                            <ContentSection key={index} xmlData={child} />
                        ))}
                </>
            );
        } else {
            if (node?.tagName === 'annex') {
                let title = `Annex ${titleIndex} (Normative) ` + xmlData.title[0];
                
                if (node) {
                    Object.values(node?.childNodes).map(
                        (child: any, index: number) => {
                            if (child?.tagName === 'title')
                                delete node.childNodes[index];
                        }
                    );
                    return (
                        <div className="content-section" id={id}>
                            <h1 className="title title-3">{title}</h1>
                            <DisplayNode data={node.childNodes} />
                            {xmlData?.clause?.length > 0 &&
                                xmlData.clause.map(
                                    (child: any, index: number) => (
                                        <ContentSection
                                            key={index}
                                            xmlData={child}
                                            titleIndex={`${titleIndex}.${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                        </div>
                    );
                }
            }

            if (titleIndex === '3' || titleIndex === '4') {
                let title = xmlData.title[0];
                title = `${titleIndex} ${title}`;
                if (node) {
                    Object.values(node?.childNodes).map(
                        (child: any, index: number) => {
                            if (
                                child?.tagName === 'term' ||
                                child?.tagName === 'title'
                            )
                                delete node.childNodes[index];
                        }
                    );
                    return (
                        <div className="content-section" id={id}>
                            <h1 className="title title-3">{title}</h1>
                            <DisplayNode data={node.childNodes} />
                            {xmlData?.term?.length > 0 &&
                                xmlData.term.map(
                                    (child: any, index: number) => (
                                        <ContentSection
                                            key={index}
                                            xmlData={child}
                                            titleIndex={`${titleIndex}.${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                            {xmlData?.clause?.length > 0 &&
                                xmlData.clause.map(
                                    (child: any, index: number) => (
                                        <ContentSection
                                            key={index}
                                            xmlData={child}
                                            titleIndex={`${titleIndex}.${
                                                index + 1
                                            }`}
                                        />
                                    )
                                )}
                        </div>
                    );
                }
            }

            // if (titleIndex.includes('3.')) {
            // console.log(xmlData, 'xmldata123')
            //     return (
            //         <div className="content-section term" id={id}>
            //             <div className="term-index">{titleIndex}</div>
            //             <DisplayNode data={[node]} />
            //         </div>
            //     );
            // }

            // if (xmlData?.title && xmlData?.title[0]) {
            let title = titleIndex;
            if (xmlData?.title && xmlData?.title[0]) {
                if (typeof xmlData.title[0] !== 'object')
                    title = `${title} ${xmlData?.title[0]}`;
                else {
                    if (xmlData.title[0]?._) {
                        title = `${title} ${xmlData?.title[0]._}`;
                    }

                    if (xmlData.title[0]?.em) {
                        title = `${title} ${xmlData?.title[0].em[0]}`;
                    }
                }
            }

            if (xmlData?.preferred) {
                let titleContent = '';
                let termSource: any[] = [];
                if (xmlData.preferred[0]?.expression) {
                    if (xmlData.preferred[0].expression[0]?.name)
                        titleContent =
                            xmlData.preferred[0].expression[0]?.name[0];
                }

                if (titleContent) title += ' ' + titleContent;

                if (xmlData?.termsource) {
                    if (xmlData.termsource.length > 0) {
                        xmlData.termsource.map((child: any, index: number) => {
                            let bibitem = '';
                            let citeas = '';
                            let text = '';
                            let version = '';

                            if (child?.origin) {
                                bibitem = child.origin[0]?.$?.bibitemid;
                                citeas = child.origin[0]?.$?.citeas;
                                text = child.origin[0]?._;
                                version = '';
                                if (child.origin[0]?.localityStack && child.origin[0].localityStack[0]?.locality && child.origin[0].localityStack[0].locality[0]?.referenceFrom) {
                                    version = child.origin[0].localityStack[0].locality[0].referenceFrom[0];
                                }
                            }

                            let modification = '';
                            if (child?.modification) {
                                if (child.modification[0]?.p && child.modification[0].p[0]?._) {
                                    modification = child.modification[0].p[0]._;
                                }
                            }

                            let resultText = '';
                            resultText += citeas;
                            resultText += resultText ? (version ? ", " + version : '') : version;

                            termSource.push({
                                bibitem,
                                text: text ? text : resultText,
                                modification
                            })
                        });
                    }
                }
                
                if (node) {
                    Object.values(node?.childNodes).map(
                        (child: any, index: number) => {
                            if (
                                child?.tagName === 'preferred' ||
                                child?.tagName === 'termsource'
                            )
                                delete node.childNodes[index];
                        }
                    );
console.log(termSource, 'termSource123' )
                    return (
                        <div className="content-section" id={id}>
                            <h1 className="title title-3">{title}</h1>
                            <DisplayNode data={node.childNodes} />
                            {termSource?.length > 0 && (
                                <div className="termsource">
                                    [ SOURCE{': '}
                                    {termSource.map(
                                        (child: any, index: number) => (
                                            <>
                                                {index !== 0 && ';'}
                                                <a
                                                    className="bibtext"
                                                    href={
                                                        child?.bibitem
                                                            ? `#${child.bibitem}`
                                                            : ''
                                                    }
                                                >
                                                    <span className="underline">{child?.text ? child.text : ''}</span>
                                                    {child?.modification ? ", modified - " + child.modification : ''}
                                                </a>
                                            </>
                                        )
                                    )}{' '}
                                    ]
                                </div>
                            )}

                        </div>
                    );
                }
            }

            if (node) {
                Object.values(node?.childNodes).map(
                    (child: any, index: number) => {
                        if (child?.tagName === 'title')
                            delete node.childNodes[index];
                    }
                );
                return (
                    <div className="content-section" id={id}>
                        <h1 className="title title-3">{title}</h1>
                        <DisplayNode data={node.childNodes} />
                        {xmlData?.clause?.length > 0 &&
                            xmlData.clause.map((child: any, index: number) => (
                                <ContentSection
                                    key={index}
                                    xmlData={child}
                                    titleIndex={`${titleIndex}.${index + 1}`}
                                />
                            ))}
                    </div>
                );
            }
            // }
        }
    }, [xmlData]);

    return <>{renderContent}</>;
}
