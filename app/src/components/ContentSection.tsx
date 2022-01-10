// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getChildsById } from '../utility';
import DisplayNode from './DisplayNode';
import SectionTerm from './SectionTerm';
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
    titleIndex?: string | any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData, titleIndex }: OwnProps) {
    const renderContent = useMemo(() => {
        const id = xmlData?.$?.id ? xmlData.$.id : '';
        let node: any = '';
        if (id) {
            node = getChildsById(id);
        }
        console.log(titleIndex, 'titleIndex', xmlData, 'xmlDat', node, 'node');
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
            if (titleIndex === '3') {
                console.log(node, 'node', xmlData.term, 'term');
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
                        </div>
                    );
                }
            }
            if (xmlData?.title && xmlData?.title[0]) {
                let title = xmlData.title[0];
                title = `${titleIndex} ${title}`;
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
            if (titleIndex.includes('3.')) {
                console.log(node, 'term node')
                return (
                    <div className="content-section term" id={id}>
                        <div className="term-index">{titleIndex}</div>
                        <DisplayNode data={[node]} />
                    </div>
                );
            }
        }
    }, [xmlData]);

    return <>{renderContent}</>;
}
