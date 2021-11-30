// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

import { useState } from "react";
import classnames from "classnames";
import NavItem from "./NavItem";

import "./NavMenu.css";
import datas from "../data/sidebar.json";

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

interface OwnProps {
  children: JSX.Element | JSX.Element[];
  content: JSX.Element | JSX.Element[];
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

export default function NavIMenu() {
  const [selectedItem, setSelectedItem] = useState("");

  return (
    <nav>
      {/* <h1 id="content">
        <a
          className="anchorjs-link "
          aria-label="Anchor"
          data-anchorjs-icon=""
          href="#content"
        ></a>
        Contents
      </h1> */}
      <div id="toc">
        <ul>
          {datas.map(item => <NavItem data={item} active={selectedItem === item.href} setSelectedItem={setSelectedItem}/>)}
        </ul>
      </div>
    </nav>
  );
}
