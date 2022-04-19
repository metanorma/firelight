// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string;
}

export default function ContentSectionWithAnnex({
    xmlData,
    node,
    titleIndex
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
    let title = `Annex ${titleIndex} (Normative) ` + xmlData.title[0];

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

    return <></>;
}
