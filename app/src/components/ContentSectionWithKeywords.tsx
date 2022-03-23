// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface Props {
    xmlData?: any;
    node?: any;
}

export default function ContentSectionWithKeywords({xmlData, node}: Props) {
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
