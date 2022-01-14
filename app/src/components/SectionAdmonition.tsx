// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionAdmonition.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionAdmonition({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const idRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";

    const typeRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "type"
    );
    const type = typeRow?.value ? typeRow.value : "";
    return <div className="admonition" id={id}>{type ? `${type.toUpperCase()}` : ''}<DisplayNode data={data.childNodes} /></div>
  }, [data]);

  return <>{renderContent}</>;
}
