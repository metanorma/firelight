#!/usr/bin/env node

/**
 * Handles building a site.
 *
 * Is a `bin` entry point (as compiled JS).
 *
 * Depends on Node, currently.
 */

import { resolve, join } from 'node:path';

import { parse as parseYAML } from 'yaml';

import { pipe, Runtime, Console, Stream, Effect, Layer, Logger, Option } from 'effect';
import * as S from '@effect/schema/Schema';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import type { PlatformError } from '@effect/platform/Error';
import { FileSystem } from '@effect/platform';
import { Options, Command } from '@effect/cli';

import type { Layout, Look, Renderer, Dependency } from './deps.jsx';
import { resolveDependency } from './deps.jsx';

import {
  type LogLevel as _LogLevel,
  buildFlags,
  parseBuildFlags,
  BuildConfigSchema,
  type BuildConfigSchemaType,
  serve as simpleServe,
  EFFECT_LOG_LEVELS,
  readdirRecursive,
} from './util/index.mjs';

import { debouncedWatcher } from './util/watch.mjs';
import {
  getExtensionURLs,
  BasicExtensionMeta,
  RegisterItem,
  RegisterMeta,
  Proposal,
  PaneronDataset,
} from './model.mjs';


/*
 * This package’s actual unpacked source file location,
 * needed when building the site
 * mainly to resolve site templates
 * (see `getPathToSiteTemplateDist()`).
 */
const PACKAGE_ROOT = resolve(join(import.meta.url.split('file://')[1]!, '..'));


/**
 * Prepares the outdir with site template.
 * If outdir already exists, clears it first.
 */
const scaffoldOutdir = ({
  source,
  layout,
  layoutParam,
}: BuildConfigSchemaType) =>
Effect.gen(function * (_) {
  const fs = yield * _(FileSystem.FileSystem);

  // Make sure outdir is available
  const maybeStat = yield * _(Effect.either(fs.stat(outdir)));
  yield * _(Effect.matchEffect(maybeStat, {
    onSuccess: (stat) => Effect.gen(function * (_) {
      if (stat.type === 'Directory') {
        // If outdir already exists and is a directory, clean it before building.
        yield * _(Console.withTime(`Cleaning ${outdir}`)(
          clearDirectoryContents(outdir)
        ));
      } else {
        // This should not be possible thanks to option typing,
        // but there could be a race
        yield * _(Effect.fail(`‘outdir’ at ${outdir} is not a directory`));
      }
    }),
    // If stat failed, assume directory doesn’t exist (we can create it)
    onFailure: Effect.succeed,
  }));
  yield * _(fs.makeDirectory(outdir, { recursive: true }));

  yield * _(Effect.all([
    scaffoldTemplate(siteTemplatePath, outdir),
    Console.withTime(`Fetch extension JS ${outdir}`)(
      fetchExtension(datadir, outdir, { devModeExtensionDirectory })
    ),
  ], { concurrency: 4 }));
});


const scaffoldTemplate = (siteTemplatePath: string, outdir: string) =>
Effect.gen(function * (_) {
  const fs = yield * _(FileSystem.FileSystem);
  yield * _(
    Console.withTime(`Scaffold site template from ${siteTemplatePath} into ${outdir}`)(
      fs.copy(siteTemplatePath, outdir, { overwrite: true })
    ),
    Effect.orElse(() => Effect.logError("Failed to scaffold template")),
  );
});


const resolveMaybeLocalDependency = (url: string) => Effect.gen(function * (_) {
  const fs = yield * _(FileSystem.FileSystem);
  const result = (!url.startsWith('file://'))
    ? yield *_(
        Effect.tryPromise(() => fetch(url)),
        Effect.flatMap(resp => Effect.tryPromise(() => resp.text())),
      )
    : yield * _(fs.readFileString(url.split('file://')[1]!));
  return result;
});


const generateData =
({ datadir, outdir, forUsername, dataVersion }: S.Schema.Type<typeof SiteBuildConfigSchema>) =>
Effect.gen(function * (_) {
  const fs = yield * _(FileSystem.FileSystem);

  // `recursive` flag is broken at least on Node 18.
  // const objectPaths = yield * _(fs.readDirectory(datadir, { recursive: true }));
  const objectPaths = yield * _(readdirRecursive(datadir));

  const out: Record<string, unknown> = yield * _(Effect.reduceEffect(
    objectPaths.
    // TODO: Parse non-YAML files as well.
    filter(p => p.endsWith('.yaml') || p.endsWith('.yml')).
    map(path => pipe(
      fs.readFileString(join(datadir, path)),
      Effect.map(parseYAML),
      Effect.flatMap(S.decodeUnknown(S.Union(PaneronDataset, RegisterMeta, RegisterItem, Proposal), { onExcessProperty: "preserve" })),
      // TODO: Shouldn’t match registry-specific items?
      Effect.flatMap(S.decodeUnknown(S.Record(S.String, S.Unknown))),
      // Catches Schema.parse failures. We do nothing with non register items.
      Effect.catchTag(
        "ParseError",
        err => Effect.logDebug(`skipping non-object YAML at ${path} due to ${String(err)}`),
      ),
      Effect.map((out) =>
        out && shouldIncludeObjectInIndex(path, out, forUsername)
          ? ({ [`/${path}`]: out })
          : ({})),
    )),
    Effect.succeed({}),
    (accum, item) => ({ ...accum, ...item }),
    { concurrency: 10 },
  ));

  yield * _(fs.writeFileString(join(outdir, 'manifest.json'), JSON.stringify({
    forUsername,
    dataVersion,
  }, undefined, 4)));

  yield * _(fs.writeFileString(join(outdir, 'data.json'), JSON.stringify(out, undefined, 4)));
});


const runExtensionBuild = (opts: BuildConfigSchemaType) => (Effect.gen(function * (_) {

  // Template-specific build

  const templateBuildScriptPath = join(
    opts.siteTemplatePath,
    '..', // Step one directory up, since siteTemplatePath goes to dist
    'build-site.mjs',
  );

  const builder = yield * _(
    Console.withTime(`Importing site builder from ${templateBuildScriptPath}`)(
      Effect.tryPromise(() => import(templateBuildScriptPath))
    ),
    Effect.tapError(err => Effect.logError(`Failed to import template build script: ${String(err)}`)),
  );

  yield * _(
    Console.withTime(`Running site builder`)(
      builder.buildSite({ ...opts, packageRoot: PACKAGE_ROOT })
    ),
    Effect.tapError(err => Effect.logError(`Failed to run template build script: ${String(err)}`)),
  );

  // Extension build (?)
  // We don’t really run “extension build” per se yet.
  //
  //return yield * _(Effect.succeed(null));
  // Another option is to shell out, e.g. with execSync:
  //
  // let cliString = `${extensionBuildScriptPath} --datadir ${datadir} --outdir ${outdir}`;
  // if (dataVersion) {
  //   cliString += ` --dataversion ${dataVersion}`;
  // }
  // if (forUsername) {
  //   cliString += ` --forusername ${forUsername}`;
  // }
  // if (logLevel === 'debug') {
  //   cliString += ` --debug`;
  // } else if (logLevel === 'info') {
  //   cliString += ` --verbose`;
  // }
  //
  // yield * _(Effect.logDebug(`Build extension: calling ${cliString}`));
  //
  // yield * _(Effect.try(() => execSync(cliString, { stdio: 'inherit' })));

// TS rightfully thinks that this effect has `unknown` requirements,
// probably due to dynamic import, so we have to cast.
}) as Effect.Effect<FileSystem.FileSystem, PlatformError, never>);


/** @deprecated for cases requiring private data exclusion use other site templates. */
function shouldIncludeObjectInIndex(
  objPath: string,
  objData: Record<string, unknown>,
  forUsername: string | undefined,
) {
  if (forUsername !== undefined || !objPath.startsWith('proposals') || objData.state === 'accepted' || objData.state === 'accepted-on-appeal') {
    return true;
  } else {
    return false;
  }
}

function readSource(sourcePath: string) {
  return Effect.gen(function * (_) {
    const fs = yield * _(FileSystem.FileSystem);
    yield * _(
      Console.withTime(`Checking source is accessible at ${sourcePath}`)
        (fs.access(sourcePath, { readable: true })),
      Effect.tapError(err =>
        Effect.logError(`Failed to check source accessibility: ${String(err)}`)
      ),
    );
    const buf = yield * _(
      fs.readFile(sourcePath),
      Effect.tapError(err =>
        Effect.logError(`Failed to read source: ${String(err)}`)
      ),
    );
    const xml = yield * _(
      Effect.try(() => (new TextDecoder).decode(buf)),
      Effect.tapError(err =>
        Effect.logError(`Failed to decode source buffer into string: ${String(err)}`)
      ),
      Effect.flatMap(data =>
        Effect.try(() => (new DOMParser()).parseFromString(data, 'text/xml'))
      ),
      Effect.tapError(err =>
        Effect.logError(`Failed to deserialize source string into XML: ${String(err)}`)
      ),
    );
    return xml;
  });
}



function prepareLayout(dep: Dependency) {
  if ((dep as any).layout !== undefined) {
    return Effect.succeed(dep as unknown as Layout);
  } else {
    return Effect.fail("Dependency is not a valid layout");
  }
}

function prepareLook(dep: Dependency) {
  if ((dep as any).layout !== undefined) {
    return Effect.succeed(dep as unknown as Look);
  } else {
    return Effect.fail("Dependency is not a valid look");
  }
}

function prepareRenderer(dep: Dependency) {
  if ((dep as any).layout !== undefined) {
    return Effect.succeed(dep as unknown as Renderer);
  } else {
    return Effect.fail("Dependency is not a valid renderer");
  }
}


const buildFull = (opts: BuildConfigSchemaType) => pipe(
  Effect.all([
    readSource(opts.source),
    resolveDependency(opts.layout, opts.layoutParam, opts.tmpdir).
      pipe(Effect.andThen((dep) => prepareLayout(dep))),
    resolveDependency(opts.look, opts.lookParam, opts.tmpdir).
      pipe(Effect.andThen((dep) => prepareLook(dep))),
    resolveDependency(opts.renderer, opts.rendererParam, opts.tmpdir).
      pipe(Effect.andThen((dep) => prepareRenderer(dep))),
  ]),
  Effect.andThen(([source, layout, look, renderer]) => Effect.gen(function * (_) {
    const library = yield * _(Effect.try(() => look.getComponentLibrary()));
    const rootElement = yield * _(Effect.try(() => layout.layout(source, library)));
    yield * _(Effect.tryPromise(() => renderer.render(rootElement)));
    return Effect.succeed("Done");
  })),
);


const build = Command.
  make(
    'build',
    buildFlags,
    (rawFlags) => pipe(
      Effect.try(() => parseBuildFlags(rawFlags, PACKAGE_ROOT)),
      Effect.andThen((opts) => pipe(
        buildFull(opts),
        Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[opts.logLevel]),
      )),
    ),
  ).
  pipe(
    Command.withDescription('build site'),
  );

const watch = Command.
  make(
    'watch',
    {
      // TODO: Watch arbitrary directories, in addition to the datadir/template dir?
      // alsoWatch: Options.directory('also-watch', { exists: 'yes' }).pipe(
      //   //Options.repeated,  // XXX https://github.com/Effect-TS/cli/issues/435
      //   Options.optional),

      // Watches site template
      watchTemplate: Options.boolean('watch-template').pipe(
        Options.optional),

      // What to ignore when watching
      // TODO: Regexp for watch ignore?
      ignorePrefix: Options.text('ignore-prefix').pipe(
        Options.optional),

      serve: Options.boolean('serve').pipe(
        Options.withDefault(false)),

      port: Options.integer('port').pipe(
        Options.withDefault(8080)),
    },
    ({ watchTemplate, ignorePrefix, serve, port }) =>
      Effect.
        gen(function * (_) {
          const rawBuildOpts = yield * _(build);
          const buildOpts =
            yield * _(Effect.try(() => parseBuildFlags(rawBuildOpts, PACKAGE_ROOT)));

          yield * _(
            buildFull(buildOpts),
            Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[buildOpts.logLevel]),
          );

          if (serve) {
            yield * _(
              Effect.fork(
                Layer.launch(Layer.scopedDiscard(
                  Effect.gen(function * (_) {
                    //const srv = yield * _(ServerContext);
                    const runtime = yield * _(Effect.runtime<never>());
                    const runFork = Runtime.runFork(runtime);
                    yield * _(
                      Effect.acquireRelease(
                        Effect.sync(() => simpleServe(
                          buildOpts.outdir,
                          port,
                          {
                            onDebug: (msg) => runFork(Effect.logDebug(msg)),
                            onError: (msg) => runFork(Effect.logError(msg)),
                          },
                        )),
                        (srv) => Effect.sync(() => srv.close()),
                      ),
                    );
                  })
                )),
              ),
              Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[buildOpts.logLevel]),
            );
          }

          const ignorePrefixes = [
            ...(Option.isNone(ignorePrefix) ? [] : [ignorePrefix.value]),
            // Spurious changes:
            // Outdir is modified during build
            // and reacting to it would cause infinite rebuilds:
            resolve(buildOpts.outdir),
            '.git',
          ];

          const watchedDirs = [
            buildOpts.datadir,
            ...(watchTemplate ? [buildOpts.siteTemplatePath] : []),
          ];

          yield * _(
            debouncedWatcher(watchedDirs, ignorePrefixes, 1000),
            Stream.runForEach(path => Effect.gen(function * (_) {
              yield * _(Effect.logDebug(`Path changed: ${path}`));
              if (path.startsWith(buildOpts.datadir)) {
                yield * _(Effect.all([
                  generateData(buildOpts),
                  runExtensionBuild(buildOpts),
                ], { concurrency: 5 }));
              } else {
                yield * _(scaffoldTemplate(buildOpts.siteTemplatePath, buildOpts.outdir));
              }
            })),
            Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[buildOpts.logLevel]),
          );
        })
  ).
  pipe(
    Command.withDescription('watch for changes'),
  );

const main = build.
  pipe(
    Command.withSubcommands([watch]),
    Command.run({
      name: "Paneron site builder (WIP)",
      version: "N/A",
    }),
  );

Effect.
  suspend(() => main(process.argv)).
  pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain,
  );


const clearDirectoryContents =
(directoryPath: string):
Effect.Effect<void, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function * (_) {
    const fs = yield * _(FileSystem.FileSystem);
    const dirContents = yield * _(fs.readDirectory(directoryPath));

    yield * _(Effect.forEach(
      dirContents,
      (path) => Effect.gen(function * (_) {
        const pathRelative = join(directoryPath, path);
        const maybeStat = yield * _(fs.stat(pathRelative));
        if (maybeStat.type === 'Directory') {
          // We could technically preserve directory structure…
          //yield * _(clearDirectoryContents(pathRelative));
          yield * _(fs.remove(pathRelative, { recursive: true }));
        } else {
          yield * _(fs.remove(pathRelative));
        }
      }),
      { concurrency: 10 },
    ));
  });

