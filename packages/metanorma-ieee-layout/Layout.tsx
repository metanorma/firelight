import React from 'react';
import { type LayoutFC, type LayoutProps } from 'anafero/index.mjs';

import * as classNames from './layout.css';


const Layout: LayoutFC = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<LayoutProps>
>(function ({
  children,
  nav,
}, ref) {

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
