// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./EmTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function StrongTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        if (typeof data === 'string') return <strong>{data}</strong>
        return <em className="em"><DisplayNode data={data.childNodes} /></em>;
      }, [data]);

  return <>{renderContent}</>;
}

