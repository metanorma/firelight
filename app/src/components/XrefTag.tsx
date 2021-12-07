// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode from "./DisplayNode";
import "./XrefTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function XrefTag({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    // const attr = data?.attributes;
    // const child = data?.childNodes;
    // const attrs: any = {};
    // attrs.href = `#${attr[0].value}`;
    // const value = child[0].data;
    // return <a {...attrs}>{value}</a>;

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
