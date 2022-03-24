// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface Props {
    xmlData?: any;
    node?: any;
}

export default function ContentSectionWithoutID({ xmlData, node }: Props) {
    let title = xmlData?.title[0];

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
