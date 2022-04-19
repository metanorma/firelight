// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
import { XMLNode } from "./DisplayNode";
import "./LabelTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any | XMLNode;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function InputTag({ data }: OwnProps) {
  const renderContent = useMemo(() => {
    const attrs: any = data.attributes;
    const props: any = {};
    const valignRow = Object.values(attrs).map(
      (attr: any) => {
        if (attr?.name) {
          props[attr.name] = attr.value;
        }
      }
    );
    return <input className="input" {...props} />
  }, [data]);

  return <>{renderContent}</>;
}
