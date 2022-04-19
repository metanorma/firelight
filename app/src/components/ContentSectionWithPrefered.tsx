// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';
import { useEffect, useMemo, useState } from 'react';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string;
}

export default function ContentSectionWithPrefered({
    xmlData,
    node,
    titleIndex
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
    // let title = titleIndex;
    const [title, setTitle] = useState(titleIndex);

    if (xmlData?.title && xmlData?.title[0]) {
        if (typeof xmlData.title[0] !== 'object')
            setTitle(`${title} ${xmlData?.title[0]}`);
        else {
            if (xmlData.title[0]?._) {
                setTitle(`${title} ${xmlData?.title[0]._}`);
            }

            if (xmlData.title[0]?.em) {
                setTitle(`${title} ${xmlData?.title[0].em[0]}`);
            }
        }
    }

    const titleContent = useMemo(() => {
        if(xmlData?.preferred)
            if (xmlData.preferred[0]?.expression) {
                if (xmlData.preferred[0].expression[0]?.name)
                    return xmlData.preferred[0].expression[0]?.name[0];
            }
        return ''
    }, [xmlData])

    if (titleContent) setTitle(title + ' ' + titleContent);

    const termSource = useMemo<any[]>(():any[] => {
        let termSource: any[] = [];
        if(xmlData?.preferred) {
            if (xmlData?.termsource) {
                if (xmlData.termsource.length > 0) {
                    xmlData.termsource.map((child: any) => {
                        let bibitem = '';
                        let citeas = '';
                        let text = '';
                        let version = '';
    
                        if (child?.origin) {
                            bibitem = child.origin[0]?.$?.bibitemid;
                            citeas = child.origin[0]?.$?.citeas;
                            text = child.origin[0]?._;
                            version = '';
                            if (
                                child.origin[0]?.localityStack &&
                                child.origin[0].localityStack[0]?.locality &&
                                child.origin[0].localityStack[0].locality[0]
                                    ?.referenceFrom
                            ) {
                                version =
                                    child.origin[0].localityStack[0].locality[0]
                                        .referenceFrom[0];
                            }
                        }
    
                        let modification = '';
                        if (child?.modification) {
                            if (
                                child.modification[0]?.p &&
                                child.modification[0].p[0]?._
                            ) {
                                modification = child.modification[0].p[0]._;
                            }
                        }
    
                        let resultText = '';
                        resultText += citeas;
                        resultText += resultText
                            ? version
                                ? ', ' + version
                                : ''
                            : version;
    
                        termSource.push({
                            bibitem,
                            text: text ? text : resultText,
                            modification
                        });
                    });
                }
            }
        }
        return termSource;
    }, [xmlData])
    const elements = useMemo(() => {
        if (xmlData?.preferred) {

            if (node) {
                Object.values(node?.childNodes).map((child: any, index: number) => {
                    if (
                        child?.tagName === 'preferred' ||
                        child?.tagName === 'termsource'
                    )
                        delete node.childNodes[index];
                });
    
                return (
                    <div className="content-section" id={id}>
                        <h1 className="title title-3">{title}</h1>
                        <DisplayNode data={node.childNodes} />
                        {termSource?.length > 0 && (
                            <div className="termsource">
                                [ SOURCE{': '}
                                {termSource.map((child: any, index: number) => (
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
                                            <span className="underline">
                                                {child?.text ? child.text : ''}
                                            </span>
                                            {child?.modification
                                                ? ', modified - ' +
                                                  child.modification
                                                : ''}
                                        </a>
                                    </>
                                ))}{' '}
                                ]
                            </div>
                        )}
                    </div>
                );
            }
        }
    
        if (node) {
            Object.values(node?.childNodes).map((child: any, index: number) => {
                if (child?.tagName === 'title') delete node.childNodes[index];
            });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [xmlData, termSource])
    

    return <>{elements}</>;
}
