// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode, { XMLNode } from "./DisplayNode";
import "./ErefTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ErefTag({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any  [] = data.attributes;
    const xrefRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "bibitemid"
    );
    // const citeasRow = Object.values(attrs).find(
    //   (attr: any) => attr?.name === "citeas"
    // );
    // attr.citeas = citeasRow.value;
    const attr: any = {};
    attr.href = `#${xrefRow.value}`;
    return <a className="eref" {...attr}><DisplayNode data={data.childNodes} /></a>
  }, [data]);

  return <>{renderContent}</>;
}
