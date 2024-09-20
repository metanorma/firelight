/**
 * Packages site builder with esbuild.
 *
 * Since this file is written in TypeScript, it itself needs to be built
 * in order to be callable by plain JS runtimes.
 *
 * Depends on Node.
 */

import { resolve, join } from 'node:path';

import { Logger, Effect } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Command } from '@effect/cli';
import { build as esbuild } from 'esbuild';

import {
  type ReportingOptions,
  parseReportingConfig,
  reportingOptions,
  EFFECT_LOG_LEVELS,
} from './util/index.mjs';


/**
 * Builds the entry point for site builder CLI command.
 *
 * NOTE: It bundles all deps into that file.
 * That may be suboptimal, since it results in a >1MB size .js script.
 * However, it makes NPX invocation faster since we have no runtime
 * dependencies, only devDependencies. Also, I couldn’t figure out
 * how to properly import runtime dependencies from a packace.json’s bin.
 */
async function _buildSiteBuilder(opts: ReportingOptions) {
  const { logLevel } = opts;
  return await esbuild({
    entryPoints: [
      join(PACKAGE_ROOT, 'site-builder.mts'),
    ],
    entryNames: '[dir]/[name]',
    assetNames: '[dir]/[name]',
    format: 'esm',
    target: ['esnext'],
    bundle: true,

    // We cannot make dependencies external, because
    // package’s bin scripts don’t seem to have access
    // to package dependencies.
    //external: ['react', 'react-dom', '@effect/*', 'effect'],

    minify: false,
    treeShaking: true,
    sourcemap: false,
    platform: 'node',
    outfile: 'site-builder.mjs',
    write: true,
    loader: {
      '.css': 'local-css',
    },
    logLevel,
    plugins: [],
  });
}


const PACKAGE_ROOT = resolve(join(import.meta.url.split('file://')[1]!, '..'));


const buildSiteBuilder = Command.make('package', reportingOptions, (rawOpts) =>
  Effect.gen(function * (_) {
    const opts = yield * _(Effect.try(() => parseReportingConfig(rawOpts)));
    yield * _(
      Effect.all([
        Effect.logDebug(`Using package root: ${PACKAGE_ROOT}`),
        Effect.tryPromise(() => _buildSiteBuilder(opts)),
      ], { concurrency: 'unbounded' }),
      Effect.tap(Effect.logDebug("Done building.")),
      Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[opts.logLevel]),
    );
  })
);

const main = Command.run(
  buildSiteBuilder,
  {
    name: "Site builder builder (internal script)",
    version: "N/A",
  },
);

Effect.
  suspend(() => main(process.argv.slice(2))).
  pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain);
