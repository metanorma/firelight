
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import { XMLNode } from "./DisplayNode";
import "./NameTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function NameTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const child = data?.childNodes;
        const value = child[0].data;
        return <span className="name">{value}</span>;
      }, [data]);

  return <>{renderContent}</>;
}
