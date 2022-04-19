// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface Props {
    xmlData?: any;
    node?: any;
}

export default function ContentSectionWitOrganization({ xmlData, node }: Props) {
    return (
        <div className="content-section" id={xmlData?.id}>
            <h1 className="title title-3">
                {xmlData?.romanNum ? xmlData?.romanNum + '. ' : ''}
                SUBMITTING ORGANIZATIONS
            </h1>
            <div className="p">{xmlData?.p ? xmlData?.p : ''}</div>
            <ul className="organization">
                {xmlData?.organizations &&
                    xmlData?.organizations.map(
                        (child: string, index: number) => (
                            <li key={index}>{child}</li>
                        )
                    )}
            </ul>
        </div>
    );
}
