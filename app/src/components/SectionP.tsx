// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { render } from "@testing-library/react";
import { useMemo } from "react";
import { getChildsById } from "../utility";
import DisplayNode from "./DisplayNode";
import "./SectionTitle.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function SectionP({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    return data.map((item: any) => {
        if (typeof item === 'string') return <p>{item}</p>;
        const id = item['$']['id'];
        const node: any = getChildsById(id);
        return <p id={id} key={id}><DisplayNode data={node.childNodes}/></p>;
    })
  }, [data]);

  return <>{renderContent}</>;
}
