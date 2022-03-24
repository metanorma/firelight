// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string | any;
}

export default function ContentSectionWitRoman({
    xmlData,
    node,
    titleIndex
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
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
    } else {
        return <></>;
    }
}
