// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import LinkTag from "./LinkTag";
import StrongTag from "./StrongTag";
import XrefTag from "./XrefTag";
import NameTag from "./NameTag";
import ImgTag from "./ImgTag";
import SectionTitle from "./SectionTitle";
import SectionP from "./SectionP";
import SectionNote from "./SectionNote";
import SectionFigure from "./SectionFigure";
import SectionOl from "./SectionOl";
import "./DisplayNode.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function DisplayNode({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    return Object.values(data).map((item: any, index: number) => {
      if (!item?.tagName) return item.data;
      if (item.tagName === "link") {
        return <LinkTag data={item} key={index}/>;
      }
      if (item.tagName === "strong") {
        return <StrongTag data={item} key={index}/>;
      }
      if (item.tagName === "xref") {
        return <XrefTag data={item} key={index}/>;
      }
      if (item.tagName === "tab") {
        return <span key={index}>{"    "}</span>;
      }
      if (item.tagName === "\n") {
        return <></>;
      }
      if (item.tagName === "name") {
        return <NameTag data={item} key={index} />
      }
      if (item.tagName === "image") {
        return <ImgTag data={item} key={index} />
      }
      if (item.tagName === 'title') {
        return <SectionTitle title={item} key={index}/>;
      }
      if (item.tagName === 'p') {
        return <SectionP data={item} key={index}/>
      }
      if (item.tagName === 'note') {
        return <SectionNote data={item} key={index} />
      }
      if (item.tagName === 'ol') {
        return <SectionOl data={item} key={index} />
      }
      if (item.tagName === 'figure') {
        return <SectionFigure data={item} key={index} />
      }
    });
  }, [data]);

  return <>{renderContent}</>;
}
