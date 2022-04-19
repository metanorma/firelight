// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';

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
                titleContent = xmlData.preferred[0].expression[0]?.name[0];
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

    return <></>;
}
