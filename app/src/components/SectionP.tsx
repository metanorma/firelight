// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useMemo } from "react";
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
        let text = item['_'];
        return <p id={id} key={id}>{text}</p>;
    })
  }, [data]);

  return <>{renderContent}</>;
}
