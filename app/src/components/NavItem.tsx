// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useEffect, useState } from "react";
import classnames from "classnames";

import "./NavItem.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  data: any;
  active: boolean;
  setSelectedItem: (s: string) => void;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function NavItem(props: OwnProps) {
  const { data, active, setSelectedItem } = props;
  const [collapse, setCollapse] = useState(true);
  const [selected, setSelected] = useState("");

  const handleClick = (href: string) => {
    setSelectedItem(data.id);
    window.location.href = `#${href}`;
  }

  useEffect(() => {
    if (!active) setSelected(""); 
  },[active]);

  return (
    <li className="h1" key={data.id}>
      <div
        className={classnames("collapse-group", { active: active })}
        onClick={(e) => handleClick(data.id)}
      >
         <div className="menu-text">{data.title}</div>
        {data.children.length > 0 && (
          <div
            className={classnames("collapse-button", { expand: !collapse })}
            onClick={(e) => setCollapse((prev) => !prev)}
          ></div>
        )}
      </div>
      <ul className={classnames({ collapse: collapse })}>
        {data.children.length > 0 &&
          data.children.map((item: any) => (
            <li className={classnames("h2 subitem", {"item-active": item.id === selected})} key={item.id} onClick={(e) => {handleClick(item.id);setSelected(item.id)} }>
              {item.title}
            </li>
          ))}
      </ul>
    </li>
  );
}
