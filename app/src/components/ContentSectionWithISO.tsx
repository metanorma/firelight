// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import DisplayNode from './DisplayNode';
import ContentSection from './ContentSection';
import ContentSectionWithAnnex from './ContentSectionWithAnnex';
import ContentSectionWith34 from './ContentSectionWith34';
import ContentSectionWithPrefered from './ContentSectionWithPrefered';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string;
}

export default function ContentSectionWithISO2({
    xmlData,
    node,
    titleIndex
}: Props) {
    const id = xmlData?.$?.id ? xmlData.$.id : '';
    if (node?.tagName === 'annex') {
        return <ContentSectionWithAnnex xmlData={xmlData} node={node} titleIndex={titleIndex} />
    }

    if (titleIndex === '3' || titleIndex === '4') {
        return <ContentSectionWith34 xmlData={xmlData} node={node} titleIndex={titleIndex} />;
    }

    return <ContentSectionWithPrefered xmlData={xmlData} node={node} titleIndex={titleIndex} />;
}
