// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./SectionP.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionP({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const valignRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "valign"
    );
    const alignRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "align"
    );
    const attr: any = {};
    attr.valign = valignRow?.value ? valignRow.value : "";
    attr.align = alignRow?.value ? alignRow.value : "";
    return <th className="th" {...attr}><DisplayNode data={data.childNodes} /></th>
  }, [data]);

  return <>{renderContent}</>;
}
