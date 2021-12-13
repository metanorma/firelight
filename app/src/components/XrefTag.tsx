// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./XrefTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function XrefTag({ data }: OwnProps) {
  const renderContent = useMemo(() => {   

    const attrs: any[] = data.attributes;
    const xrefRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "target"
    );
    const attr: any = {};
    attr.href = `#${xrefRow.value}`;
    return <a className="xref" {...attr}><DisplayNode data={data.childNodes} /></a>
  }, [data]);

  return <>{renderContent}</>;
}
