// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import LinkTag from "./LinkTag";
import StrongTag from "./StrongTag";
import EmTag from "./EmTag";
import XrefTag from "./XrefTag";
import ErefTag from "./ErefTag";
import NameTag from "./NameTag";
import ImgTag from "./ImgTag";
import SectionTitle from "./SectionTitle";
import SectionP from "./SectionP";
import SectionNote from "./SectionNote";
import SectionFigure from "./SectionFigure";
import SectionOl from "./SectionOl";
import SectionTerm from "./SectionTerm";
import SectionPreferred from "./SectionPreferred";
import SectionDefinition from "./SectionDefinition";
import SectionTermnote from "./SectionTermnote";
import TermText from "./TermText";
import "./DisplayNode.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function DisplayNode({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    return Object.values(data).map((item: any, index: number) => {
  
      if (!item?.tagName) return <TermText text={item.data} key={index}/>;
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
          return <span key={index}>{"    "}</span>;
        case "\n":
          return <></>;

        case "name":
          return <NameTag data={item} key={index} />;

        case "image":
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

      }
    });
  }, [data]);

  return <>{renderContent}</>;
}
