// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import ContentSectionWithAnnex from './ContentSectionWithAnnex';
import ContentSectionWith34 from './ContentSectionWith34';
import ContentSectionWithPrefered from './ContentSectionWithPrefered';

interface Props {
    xmlData?: any;
    node?: any;
    titleIndex?: string;
}

export default function ContentSectionWithTitleIndex({
    xmlData,
    node,
    titleIndex
}: Props) {
    
    if (node?.tagName === 'annex') {
        return <ContentSectionWithAnnex xmlData={xmlData} node={node} titleIndex={titleIndex} />
    }

    if (titleIndex === '3' || titleIndex === '4') {
        return <ContentSectionWith34 xmlData={xmlData} node={node} titleIndex={titleIndex} />;
    }

    return <ContentSectionWithPrefered xmlData={xmlData} node={node} titleIndex={titleIndex} />;
}
