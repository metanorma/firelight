import { type Types, LogLevel as EffectLogLevel } from 'effect';
import * as S from '@effect/schema/Schema';
import type { Command as CommandType } from '@effect/cli/Command';
import { Options } from '@effect/cli';


export const reportingOptions = {
  verbose: Options.boolean("verbose"),
  debug: Options.boolean("debug"),
} as const;


export const LogLevelSchema = S.Literal('debug', 'info', 'error', 'silent');
export type LogLevel = S.Schema.Type<typeof LogLevelSchema>
export const EFFECT_LOG_LEVELS: { [key in LogLevel]: EffectLogLevel.LogLevel } = {
  'debug': EffectLogLevel.Debug,
  'info': EffectLogLevel.Info,
  'error': EffectLogLevel.Error,
  'silent': EffectLogLevel.None,
} as const;

export const ReportingConfigSchema = S.Struct({
  logLevel: LogLevelSchema,
});
export interface ReportingOptions extends S.Schema.Type<typeof ReportingConfigSchema> {}

export function parseReportingConfig(
  values: Types.Simplify<CommandType.ParseConfig<typeof reportingOptions>>,
) {
  return S.decodeUnknownSync(ReportingConfigSchema)({
    logLevel: values.debug
      ? 'debug'
      : values.verbose
        ? 'info'
        : 'error'
  });
}

