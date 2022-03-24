// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';

interface Props {
    xmlData?: any;
    node?: any;
}

export default function ContentSectionWithoutTitleIndex({
    xmlData,
    node
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
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
}
