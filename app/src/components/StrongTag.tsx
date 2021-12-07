// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import DisplayNode from "./DisplayNode";
import "./StrongTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function StrongTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        if (typeof data === 'string') return <strong>{data}</strong>
        return <strong className="strong"><DisplayNode data={data.childNodes} /></strong>;
      }, [data]);

  return <>{renderContent}</>;
}

