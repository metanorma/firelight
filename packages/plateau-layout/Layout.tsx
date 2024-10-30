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
  //const parents = S.is(SubresourceNavigationSchema)(nav) ? [...nav.parents] : null;

      //<a href={[...new Array(idx + 1)].map(() => '../').join('')}>
  const breadcrumbs = nav.breadcrumbs.map((link, idx) =>
    <li key={link.path}>
      <a href={link.path}>
        {link.plainTitle}
      </a>
      {idx !== 0 ? <>&emsp;</> : null}
    </li>
  );
  breadcrumbs?.reverse();

  return (
    <div className={classNames.overall} ref={ref}>

      {children}

      <nav>
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

    </div>
  );
});


export default Layout;
