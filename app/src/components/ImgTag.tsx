
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { useMemo } from "react";
import "./ImgTag.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function ImgTag({ data }: OwnProps) {
    const renderContent = useMemo(() => { 
        const attrs: any = {};
        const attr = data?.attributes;
        Object.values(attr).map((item: any) => {
          if (item.name) attrs[item.name] = item.value;
        });
        return <img className="img" {...attrs} alt="figure" />;
      }, [data]);

  return <>{renderContent}</>;
}
