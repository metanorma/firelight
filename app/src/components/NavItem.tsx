// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from "react";
import classnames from "classnames";

import "./NavItem.css";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  data: any;
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function NavItem(props: OwnProps) {
  const { data } = props;
  const [active, setActive] = useState(false);
  const [collapse, setCollapse] = useState(true);
  console.log(collapse, 'colla')

  return (
    <li className="h1" key={data.href}>
      <div
        className={classnames("collapse-group", { active: active })}
        onClick={(e) => setActive(true)}
      >
        <a href="#toc4"> {data.content}</a>
        <div
          className={classnames("collapse-button", { expand: !collapse })}
          onClick={(e) => setCollapse(prev => !prev)}
        ></div>
      </div>
      <ul className={classnames({ collapse: collapse })}>
        {data.children.length > 0 &&
          data.children.map((item: any) => <li className="h2" key={item.href}><a href={item.href}>{item.content}</a></li>)}
      </ul>
    </li>
  );
}
