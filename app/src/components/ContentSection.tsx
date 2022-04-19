// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import { getChildsById } from '../utility';
import { useXmlData } from '../context';
import ContentSectionWithKeywords from './ContentSectionWithKeywords';
import ContentSectionWithoutID from './ContentSectionWithoutID';
import ContentSectionWitOrganization from './ContentSectionWithOrganization';
import ContentSectionWitRoman from './ContentSectionWithRoman';

import './ContentSection.css';
import ContentSectionWithoutTitleIndex from './ContentSectionWithoutTitleIndex';
import ContentSectionWithTitleIndex from './ContentSectionWithTitleIndex';
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
    xmlData: any;
    titleIndex?: string | any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ContentSection({ xmlData, titleIndex }: OwnProps) {
    const { xml } = useXmlData();
    
    const renderContent = useMemo(() => {
        const id = xmlData?.$?.id ? xmlData.$.id : '';
        let node: any = '';
        if (!id) {
            if (xmlData?.title && xmlData.title[0]) {
                return <ContentSectionWithoutID xmlData={xmlData} />;
            }
        }

        node = getChildsById(id, xml);

        if (xmlData?.id && xmlData.id === '_keywords') {
            return <ContentSectionWithKeywords xmlData={xmlData} />;
        }

        if (xmlData?.id && xmlData.id === '_organizations') {
            return <ContentSectionWitOrganization xmlData={xmlData} />;
        }

        if (xmlData?.romanNum) {
            return <ContentSectionWitRoman xmlData={xmlData} node={node} titleIndex={titleIndex} />;
        }

        if (!titleIndex) {
            return <ContentSectionWithoutTitleIndex xmlData={xmlData} node={node} />
        } else {
            return <ContentSectionWithTitleIndex xmlData={xmlData} node={node} titleIndex={titleIndex} />
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [xmlData]);

    return <>{renderContent}</>;
}
