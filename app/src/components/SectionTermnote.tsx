// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode from "./DisplayNode";
import "./SectionTermnote.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionNote({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const depthRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = depthRow?.value ? depthRow.value : "";
    return <div id={id} className="term-note"><DisplayNode data={data.childNodes} /></div>
  }, [data]);

  return <>{renderContent}</>;
}
