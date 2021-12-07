// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode from "./DisplayNode";
import "./SectionNote.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionNote({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const idRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    const id = idRow?.value ? idRow.value : "";
    return <div id={id} className="note"><DisplayNode data={data.childNodes} /></div>
  }, [data]);

  return <>{renderContent}</>;
}
