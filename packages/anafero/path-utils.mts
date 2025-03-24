export function stripLeadingSlash(aPath: string): string {
  return aPath.replace(/^\//, '');
}

export function stripTrailingSlash(aPath: string): string {
  return aPath.replace(/\/$/, '');
}
