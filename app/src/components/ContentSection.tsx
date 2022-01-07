// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getChildsById } from '../utility';
import DisplayNode from './DisplayNode';
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

        if (!titleIndex) {
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
            console.log(xmlData?.title, 'title');
            if (xmlData?.title && xmlData?.title[0]) {
                let title = xmlData.title[0];
                title = `${titleIndex} ${title}`;
                if (node) {
                    delete node.childNodes[0];
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
        }
    }, [xmlData]);

    return <>{renderContent}</>;
}
