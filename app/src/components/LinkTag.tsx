// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import { XMLNode } from "./DisplayNode";
import "./LinkTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function LinkTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attr = data?.attributes;
        const child = data?.childNodes;
        const attrs: any = {};
        attrs.href = attr[0].value;
        let value = '';
        if(child.length && child[0].data) value = child[0].data;
        return <a {...attrs} key={attrs.href} className="link">{value}</a>;
      }, [data]);

  return <>{renderContent}</>;
}
