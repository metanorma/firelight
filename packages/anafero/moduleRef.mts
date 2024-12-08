import * as S from 'effect/Schema';


const RepoURLSchema = S.NonEmptyString;

const RefAndOptionalSubdirSchema = S.NonEmptyString.pipe(
  S.filter(
    (s) => !s.startsWith('/') || "a Git ref (branch or tag, no slashes allowed), optionally followed by a slash-prepended repo-relative directory path"
  )
);

export const GitModuleRefSchema = S.TemplateLiteralParser(
  'git+https://',
  RepoURLSchema,
  '#',
  RefAndOptionalSubdirSchema,
);

export type GitModuleRef = S.Schema.Type<typeof GitModuleRefSchema>;


export function parseModuleRef(moduleRef: string): [
  url: string,
  oid: string,
  subdir: string | undefined,
] {
  const parts = S.decodeUnknownSync(GitModuleRefSchema)(moduleRef);
  const url = `https://${parts[1]}`;
  const refAndMaybeSubdir = parts[3];
  const [ref, subdir]: [string, string | undefined] = refAndMaybeSubdir.indexOf('/') > 0
    ? [refAndMaybeSubdir.split('/')[0]!, refAndMaybeSubdir.slice(refAndMaybeSubdir.indexOf('/'))]
    : [refAndMaybeSubdir, undefined];
  return [url, ref, subdir];
}
