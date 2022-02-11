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
        let target: any = Object.values(attr).find(
          (child: any) => child?.name === 'target'
        );

        attrs.href = target?.value;
        let value = '';
        if(child.length && child[0].data) value = child[0].data;
        if (!value) {
          value = attrs.href;
        } 
        return <a {...attrs} key={attrs.href} className="link">{value}</a>;
      }, [data]);

  return <>{renderContent}</>;
}
