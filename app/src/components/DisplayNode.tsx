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
import SectionUl from './SectionUl';
import SectionTerm from './SectionTerm';
import SectionPreferred from './SectionPreferred';
import SectionDefinition from './SectionDefinition';
import SectionTermnote from './SectionTermnote';
import SectionForm from './SectionForm';
import SectionTable from './SectionTable';
import SectionColgroup from './SectionColgroup';
import SectionCol from './SectionCol';
import SectionThead from './SectionThead';
import SectionTbody from './SectionTbody';
import SectionTfoot from './SectionTfoot';
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
import SectionAdmitted from './SectionAdmitted';
import SectionTermexample from './SectionTermexample';
import SectionDomain from './SectionDomain';
import SectionConcept from './SectionConcept';
import SectionStem from './SectionStem';
import SectionMath from './SectionMath';
import SectionMsub from './SectionMsub';
import SectionMrow from './SectionMrow';
import SectionMi from './SectionMi';
import SectionMn from './SectionMn';
import SectionMo from './SectionMo';
import SectionMfrac from './SectionMfrac';
import SectionFn from './SectionFn';
import SectionAdmonition from './SectionAdmonition';
import SectionFormula from './SectionFormula';
import SectionTt from './SectionTt';
import VerbalDefinition from './VerbalDefinition';
import SectionFormmatedRef from './SectionFormattedRef';
import SectionExample from './SectionExample';
import SectionSourcecode from './SectionSourcecode';
import SectionExpression from './SectionExpression';
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
            // if (!item?.tagName)
            //     return <TermText text={item.data} key={`${item.tagName}-${index}`} />;
            if (!item?.tagName) return item.data;

            switch (item.tagName) {
                case 'link':
                    return <LinkTag data={item} key={`${item.tagName}-${index}`} />;

                case 'br':
                    return <br />;

                case 'strong':
                    return <StrongTag data={item} key={`${item.tagName}-${index}`} />;

                case 'em':
                    return <EmTag data={item} key={`${item.tagName}-${index}`} />;

                case 'xref':
                    return <XrefTag data={item} key={`${item.tagName}-${index}`} />;

                case 'eref':
                    return <ErefTag data={item} key={`${item.tagName}-${index}`} />;

                case 'tab':
                    return <span key={`${item.tagName}-${index}`}>{'    '}</span>;

                case '\n':
                    return <></>;

                case 'name':
                    return <NameTag data={item} key={`${item.tagName}-${index}`} />;

                case 'image':
                    return <ImgTag data={item} key={`${item.tagName}-${index}`} />;

                case 'title':
                    return <SectionTitle title={item} key={`${item.tagName}-${index}`} />;

                case 'p':
                    return <SectionP data={item} key={`${item.tagName}-${index}`} />;

                case 'note':
                    return <SectionNote data={item} key={`${item.tagName}-${index}`} />;

                case 'ol':
                    return <SectionOl data={item} key={`${item.tagName}-${index}`} />;
                case 'ul':
                    return <SectionUl data={item} key={`${item.tagName}-${index}`} />;

                case 'figure':
                    return <SectionFigure data={item} key={`${item.tagName}-${index}`} />;

                case 'term':
                    return <SectionTerm data={item} key={`${item.tagName}-${index}`} />;

                case 'preferred':
                    return <SectionPreferred data={item} key={`${item.tagName}-${index}`} />;

                case 'definition':
                    return <SectionDefinition data={item} key={`${item.tagName}-${index}`} />;

                case 'termnote':
                    return <SectionTermnote data={item} key={`${item.tagName}-${index}`} />;

                case 'form':
                    return <SectionForm data={item} key={`${item.tagName}-${index}`} />;

                case 'table':
                    return <SectionTable data={item} key={`${item.tagName}-${index}`} />;

                case 'colgroup':
                    return <SectionColgroup data={item} key={`${item.tagName}-${index}`} />;

                case 'col':
                    return <SectionCol data={item} key={`${item.tagName}-${index}`} />;

                case 'thead':
                    return <SectionThead data={item} key={`${item.tagName}-${index}`} />;

                case 'tbody':
                    return <SectionTbody data={item} key={`${item.tagName}-${index}`} />;

                case 'tfoot':
                    return <SectionTfoot data={item} key={`${item.tagName}-${index}`} />;

                case 'tr':
                    return <SectionTr data={item} key={`${item.tagName}-${index}`} />;

                case 'th':
                    return <SectionTh data={item} key={`${item.tagName}-${index}`} />;

                case 'td':
                    return <SectionTd data={item} key={`${item.tagName}-${index}`} />;

                case 'tt':
                    return <SectionTt data={item} key={`${item.tagName}-${index}`} />;

                case 'dl':
                    return <SectionDl data={item} key={`${item.tagName}-${index}`} />;

                case 'dt':
                    return <SectionDt data={item} key={`${item.tagName}-${index}`} />;

                case 'dd':
                    return <SectionDd data={item} key={`${item.tagName}-${index}`} />;

                case 'label':
                    return <LabelTag data={item} key={`${item.tagName}-${index}`} />;

                case 'input':
                    return <InputTag data={item} key={`${item.tagName}-${index}`} />;

                case 'example':
                    return <SectionExample data={item} key={`${item.tagName}-${index}`} />;

                case 'references':
                    return <SectionReference data={item} key={`${item.tagName}-${index}`} />;

                case 'bibitem':
                    return <SectionBibitem data={item} key={`${item.tagName}-${index}`} />;

                case 'formattedref':
                    return <SectionFormattedDoc data={item} key={`${item.tagName}-${index}`} />;

                case 'docidentifier':
                    return <SectionDocidentifier data={item} key={`${item.tagName}-${index}`} />;

                case 'admitted':
                    return <SectionAdmitted data={item} key={`${item.tagName}-${index}`} />;

                case 'termexample':
                    return <SectionTermexample data={item} key={`${item.tagName}-${index}`} />;

                case 'domain':
                    return <SectionDomain data={item} key={`${item.tagName}-${index}`} />;

                case 'concept':
                    return <SectionConcept data={item} key={`${item.tagName}-${index}`} />;

                case 'stem':
                    return <SectionStem data={item} key={`${item.tagName}-${index}`} />;

                case 'math':
                    return <SectionMath data={item} key={`${item.tagName}-${index}`} />;

                case 'msub':
                    return <SectionMsub data={item} key={`${item.tagName}-${index}`} />;

                case 'mrow':
                    return <SectionMrow data={item} key={`${item.tagName}-${index}`} />;

                case 'mi':
                    return <SectionMi data={item} key={`${item.tagName}-${index}`} />;

                case 'mn':
                    return <SectionMn data={item} key={`${item.tagName}-${index}`} />;

                case 'mo':
                    return <SectionMo data={item} key={`${item.tagName}-${index}`} />;

                case 'mfrac':
                    return <SectionMfrac data={item} key={`${item.tagName}-${index}`} />;

                case 'fn':
                    return <SectionFn data={item} key={`${item.tagName}-${index}`} />;

                case 'admonition':
                    return <SectionAdmonition data={item} key={`${item.tagName}-${index}`} />;

                case 'formula':
                    return <SectionFormula data={item} key={`${item.tagName}-${index}`} />;
                    
                case 'sourcecode':
                    return <SectionSourcecode data={item} key={`${item.tagName}-${index}`} />;

                case 'verbal-definition':
                    return <VerbalDefinition data={item} key={`${item.tagName}-${index}`} />;

                case 'formmatedref':
                    return <SectionFormmatedRef data={item} key={`${item.tagName}-${index}`} />;
                case 'expression':
                    return <SectionFormmatedRef data={item} key={`${item.tagName}-${index}`} />;
            }
        });
    }, [data]);

    return <>{renderContent}</>;
}
