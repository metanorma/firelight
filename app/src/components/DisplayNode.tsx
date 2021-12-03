// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import { getChildsById } from "../utility";
import LinkTag from "./LinkTag";
import StrongTag from "./StrongTag";
import XrefTag from "./XrefTag";
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
    });
  }, [data]);

  return <>{renderContent}</>;
}
