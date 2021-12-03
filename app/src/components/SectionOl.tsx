// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import ContentSection from "./ContentSection";
import "./SectionOl.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionOl({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    if (typeof data === "string") return <ol>{data}</ol>;
    const id = data?.$?.id ? data.$.id : "";
    const type = data?.$?.type ? data.$.type : "";
    return <ol type="A">{
      data?.li?.length > 0 && data.li.map((item:any, index: number) => 
        <li key={index}><ContentSection xmlData={item} /></li>
      )
    }</ol>
  }, [data]);

  return <>{renderContent}</>;
}
