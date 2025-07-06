import React from 'react';
import { type LayoutFC, type LayoutProps } from 'anafero/index.mjs';

import * as classNames from './layout.css';


/** Provisional. Might be useful for Japanese typesetting? */
function convertToFullwidth (text: string) {
  var output = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i]! >= '!' && text[i]! <= '~') { // Check whether character is latin
      output += String.fromCharCode(text.charCodeAt(i) - 0x20 + 0xff00); // Convert to fullwidth
    } else if (text[i] == " ") { // Check if character is space
      output += "　"; // Convert to fullwidth space
    } else {
      output += text[i]; // Leave it be
    }
  }
  return output
}


const Layout: LayoutFC = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<LayoutProps>
>(function ({
  children,
  nav,
}, ref) {
  //const parents = S.is(SubresourceNavigationSchema)(nav) ? [...nav.parents] : null;
  //<a href={[...new Array(idx + 1)].map(() => '../').join('')}>

  //const breadcrumbs = nav.breadcrumbs.map((link, idx) =>
  //  <li key={link.path}>
  //    <a href={link.path}>
  //      {link.plainTitle}
  //    </a>
  //    {idx !== 0 ? <>&emsp;</> : null}
  //  </li>
  //);
  //breadcrumbs?.reverse();

  return (
    <div className={classNames.overall} ref={ref}>

      {children}

      {nav.children.length > 0
        ? <nav className={classNames.descendantNavigation}>
            <ul>
              {nav.children.map(link =>
                <li key={link.path}>
                  <a href={link.path}>
                    {link.plainTitle}
                  </a>
                </li>
              )}
            </ul>
          </nav>
        : null}

    </div>
  );
});


export default Layout;
