import React, { useMemo } from 'react';
import { type NavLink } from 'anafero/Layout.mjs';
import classNames from './style.module.css';


export const ResourceBreadcrumbs: React.FC<{
  /** Parents, from nearest all the way to the top. */
  parents: Readonly<readonly NavLink[]>;
  className?: string;
}> = function ({ parents, className }) {
  const breadcrumbs = useMemo(() => {
    const b = [ ...parents ];
    b.reverse();
    return b;
  }, [parents.map(p => p.path).join(' ')]);
  return <ul className={classNames.resourceBreadcrumbsNav}>
    {breadcrumbs.map(link =>
      <li key={link.path}> <a href={link.path}>
        {link.plainTitle}</a>
      </li>)
    }
  </ul>
};


export const ResourceParts: React.FC<{
  parts: Readonly<readonly NavLink[]>;
  className?: string;
}> = function ({ parts, className }) {
  return (
    <ul className={classNames.resourcePartsNav}>
      {parts.map(link =>
        <li key={link.path}>
          <a href={link.path}>
            {link.plainTitle}
          </a>
        </li>
      )}
    </ul>
  )
}
