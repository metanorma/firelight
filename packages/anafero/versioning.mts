import * as S from '@effect/schema/Schema';


/** Describes a given version. */
export const VersionMetaSchema = S.Struct({
  label: S.String.pipe(S.nonEmptyString()),
  timestamp: S.Date,
});
export type VersionMeta = S.Schema.Type<typeof VersionMetaSchema>;


export const VersioningSchema = S.Struct({
  versions: S.Record({ key: S.String.pipe(S.nonEmptyString()), value: VersionMetaSchema }),
  /** Version that is the current/default published version. */
  currentVersionID: S.String.pipe(S.nonEmptyString()),
  /** Version that is navigated to. */
  activeVersionID: S.String.pipe(S.nonEmptyString()),
});
export type Versioning = S.Schema.Type<typeof VersioningSchema>;
