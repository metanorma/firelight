// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import "./StrongTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function StrongTag({ data }: OwnProps) {
    const renderContent = useMemo(() => {
        const value = data.childNodes[0].data;
        return <strong className="strong">{value}</strong>;
      }, [data]);

  return <>{renderContent}</>;
}

