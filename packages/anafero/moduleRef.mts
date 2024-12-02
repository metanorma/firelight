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
