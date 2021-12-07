// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import DisplayNode from "./DisplayNode";
import "./SectionPreferred.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionTerm({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any[] = data.attributes;
    const depthRow = Object.values(attrs).find(
      (attr: any) => attr?.name === "id"
    );
    console.log(data, 'preferred')
    const id = depthRow?.value ? depthRow.value : "";
    return <div className="preferred" id={id}><DisplayNode data={data.childNodes} /></div>
  }, [data]);

  return <>{renderContent}</>;
}
