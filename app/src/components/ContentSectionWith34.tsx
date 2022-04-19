// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';
import { useMemo } from 'react';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string;
}

export default function ContentSectionWith34({
    xmlData,
    node,
    titleIndex
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
    let title = xmlData.title[0];
    title = `${titleIndex} ${title}`;

    const elements = useMemo(() => {
        if (node) {
            Object.values(node?.childNodes).map((child: any, index: number) => {
                if (child?.tagName === 'term' || child?.tagName === 'title')
                    delete node.childNodes[index];
            });
            return (
                <div className="content-section" id={id}>
                    <h1 className="title title-3">{title}</h1>
                    <DisplayNode data={node.childNodes} />
                    {xmlData?.term?.length > 0 &&
                        xmlData.term.map((child: any, index: number) => (
                            <ContentSection
                                key={index}
                                xmlData={child}
                                titleIndex={`${titleIndex}.${index + 1}`}
                            />
                        ))}
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
    }, [xmlData])
    
    return <>{elements}</>;
}
