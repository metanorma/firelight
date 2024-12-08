import * as S from '@effect/schema/Schema';

// TODO: Write Effect schema for ProseMirror doc & properly validate it.

export default S.Struct({ type: S.Struct({ name: S.String.pipe(S.nonEmptyString()) }) });
