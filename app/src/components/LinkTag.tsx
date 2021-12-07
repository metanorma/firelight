// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import "./LinkTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function LinkTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const attr = data?.attributes;
        const child = data?.childNodes;
        const attrs: any = {};
        attrs.href = attr[0].value;
        const value = child[0].data;
        return <a {...attrs} key={attrs.href} className="link">{value}</a>;
      }, [data]);

  return <>{renderContent}</>;
}
