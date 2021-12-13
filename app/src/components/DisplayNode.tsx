// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from 'react';
import LinkTag from './LinkTag';
import StrongTag from './StrongTag';
import EmTag from './EmTag';
import XrefTag from './XrefTag';
import ErefTag from './ErefTag';
import NameTag from './NameTag';
import ImgTag from './ImgTag';
import SectionTitle from './SectionTitle';
import SectionP from './SectionP';
import SectionNote from './SectionNote';
import SectionFigure from './SectionFigure';
import SectionOl from './SectionOl';
import SectionTerm from './SectionTerm';
import SectionPreferred from './SectionPreferred';
import SectionDefinition from './SectionDefinition';
import SectionTermnote from './SectionTermnote';
import TermText from './TermText';
import SectionForm from './SectionForm';
import SectionTable from './SectionTable';
import SectionColgroup from './SectionColgroup';
import SectionCol from './SectionCol';
import SectionThead from './SectionThead';
import SectionTbody from './SectionTbody';
import SectionTh from './SectionTh';
import SectionTd from './SectionTd';
import SectionTr from './SectionTr';
import SectionDl from './SectionDl';
import SectionDd from './SectionDd';
import SectionDt from './SectionDt';
import LabelTag from './LabelTag';
import InputTag from './InputTag';
import SectionReference from './SectionReference';
import './DisplayNode.css';
import SectionDocidentifier from './SectionDocidentifier';
import SectionBibitem from './SectionBibitem';
import SectionFormattedDoc from './SectionFormattedDoc';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
    data: any;
}

export interface XMLNode {
    attributes?: any;
    childNodes?: any;
    tagName?: string;
    data?: string;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function DisplayNode({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        return Object.values(data).map((item: XMLNode | any, index: number) => {
            if (!item?.tagName)
                return <TermText text={item.data} key={index} />;
            // if (!item?.tagName) return item.data;

            switch (item.tagName) {
                case 'link':
                    return <LinkTag data={item} key={index} />;

                case 'strong':
                    return <StrongTag data={item} key={index} />;

                case 'em':
                    return <EmTag data={item} key={index} />;

                case 'xref':
                    return <XrefTag data={item} key={index} />;

                case 'eref':
                    return <ErefTag data={item} key={index} />;

                case 'tab':
                    return <span key={index}>{'    '}</span>;

                case '\n':
                    return <></>;

                case 'name':
                    return <NameTag data={item} key={index} />;

                case 'image':
                    return <ImgTag data={item} key={index} />;

                case 'title':
                    return <SectionTitle title={item} key={index} />;

                case 'p':
                    return <SectionP data={item} key={index} />;

                case 'note':
                    return <SectionNote data={item} key={index} />;

                case 'ol':
                    return <SectionOl data={item} key={index} />;

                case 'figure':
                    return <SectionFigure data={item} key={index} />;

                case 'term':
                    return <SectionTerm data={item} key={index} />;

                case 'preferred':
                    return <SectionPreferred data={item} key={index} />;

                case 'definition':
                    return <SectionDefinition data={item} key={index} />;

                case 'termnote':
                    return <SectionTermnote data={item} key={index} />;

                case 'form':
                    return <SectionForm data={item} key={index} />;

                case 'table':
                    return <SectionTable data={item} key={index} />;

                case 'colgroup':
                    return <SectionColgroup data={item} key={index} />;

                case 'col':
                    return <SectionCol data={item} key={index} />;

                case 'thead':
                    return <SectionThead data={item} key={index} />;

                case 'tbody':
                    return <SectionTbody data={item} key={index} />;

                case 'tr':
                    return <SectionTr data={item} key={index} />;

                case 'th':
                    return <SectionTh data={item} key={index} />;

                case 'td':
                    return <SectionTd data={item} key={index} />;

                case 'dl':
                    return <SectionDl data={item} key={index} />;

                case 'dt':
                    return <SectionDt data={item} key={index} />;

                case 'dd':
                    return <SectionDd data={item} key={index} />;

                case 'label':
                    return <LabelTag data={item} key={index} />;

                case 'input':
                    return <InputTag data={item} key={index} />;

                case 'references':
                    return <SectionReference data={item} key={index} />;

                case 'bibitem':
                    return <SectionBibitem data={item} key={index} />;

                case 'formattedref':
                    return <SectionFormattedDoc data={item} key={index} />;
                    
                case 'docidentifier':
                    return <SectionDocidentifier data={item} key={index} />;
            }
        });
    }, [data]);

    return <>{renderContent}</>;
}
