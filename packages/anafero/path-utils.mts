export function stripLeadingSlash(aPath: string): string {
  return aPath.replace(/^\//, '');
}

export function stripTrailingSlash(aPath: string): string {
  return aPath.replace(/\/$/, '');
}

/**
 * E.g., for '/foo/bar/baz' returns ['', '/foo', '/foo/bar']
 *
 * Given path must not have trailing slash, but must have leading slash.
 */
export function getAllParentPaths(aPath: string): string[] {
  let path = aPath;

  const parents: string[] = [];

  // There would be no leading slash
  while (path.includes('/')) {
    const parent = path.slice(0, path.lastIndexOf('/'));
    parents.push(parent);
    path = parent;
  }

  parents.reverse();

  return parents;
}
