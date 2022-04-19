// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./VerbalDefinition.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function VerbalDefinition({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        if (typeof data === 'string') return <strong>{data}</strong>;
        return <div className="verbal-definition"><DisplayNode data={data.childNodes} /></div>;
      }, [data]);

  return <>{renderContent}</>;
}

