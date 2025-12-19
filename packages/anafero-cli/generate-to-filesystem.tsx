#!/usr/bin/env node

/**
 * Handles building a site.
 * Is a `bin` entry point.
 */

import { resolve, dirname, extname, join } from 'node:path';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { parse as parseURL } from 'node:url'
import { createServer } from 'node:http';
import { watch } from 'node:fs/promises';

import fs from 'node:fs';
import http from 'isomorphic-git/http/node';
import git, { type CommitObject } from 'isomorphic-git';

import { pointsToLFS } from '@riboseinc/isogit-lfs/util.js';
import { readPointer, downloadBlobFromPointer } from '@riboseinc/isogit-lfs';

import { pipe, Effect, Logger, LogLevel, Option, Stream, Console } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { FileSystem } from '@effect/platform';
import { Options, Command } from '@effect/cli';

import React from 'react';
import { render } from 'ink';
import { Processor } from './CLI.jsx';
import { type TaskProgressCallback } from 'anafero/progress.mjs';
import { type Cache, makeDummyInMemoryCache } from 'anafero/cache.mjs';

import { JSDOM } from 'jsdom';
import xpath from 'xpath';


// Anafero relies on intercept-link-clicks which relies on window.location.host to be a string…
(global as any).window = { location: { host: '' } };


import { generateStaticSiteAssets } from 'anafero/process.mjs';
import { type VersionBuildConfig, type VersionMeta } from 'anafero/index.mjs';

import {
  fetchDependency,
  buildDependency,
  writePreBuiltAssets,
  getDependencySources,
  getDependencySupportingFiles,
} from './dependencies.mjs';
import {
  reportingOptions,
  parseReportingConfig,
  EFFECT_LOG_LEVELS,
} from './util.mjs';


const PACKAGE_ROOT = resolve(join(import.meta.url.split('file://')[1]!, '..'));
console.debug("Package root", PACKAGE_ROOT);

const decoder = new TextDecoder();

const cwd = process.cwd();
console.debug("Current working directory", cwd);


Effect.
  suspend(() => main(process.argv)).
  pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain,
  );


function unpackOption<T>(opt: Option.Option<T>, df?: T): T | undefined {
  return Option.isNone(opt) ? df : opt.value;
}


const dispatch = Command.
  make(
    "npx --node-options='--experimental-vm-modules' -y @riboseinc/anafero-cli",
    {},
    () => Effect.log("Pass --help for usage instructions")).
  pipe(
    Command.withDescription("Anafero builder. Use with a subcommand."),
  );

const buildPackage = Command.
  make('build-package', reportingOptions, () => Effect.gen(function * (_) {
    const moduleRef = yield * _(
      Effect.tryPromise(() => readFile(join(cwd, 'package.json'))),
      Effect.flatMap(blob => Effect.try(() => decoder.decode(blob))),
      Effect.flatMap(pkgRaw => Effect.try(() => JSON.parse(pkgRaw))),
      Effect.flatMap(pkg => Effect.succeed(pkg['name'])),
    );
    yield * _(Effect.log(`Building package ${moduleRef}`));
    const [bundledCode, assets] = yield * _(Effect.tryPromise(() => {
      return buildDependency(
        moduleRef,
        cwd,
        (progress) => console.debug(JSON.stringify(progress)),
      );
    }));
    yield * _(Effect.tryPromise(() => writePreBuiltAssets(
      cwd,
      bundledCode,
      assets,
    )));
  })).
  pipe(
    Command.withDescription("For developers: builds adapter in current directory into `./dist`."),
  );

const buildSite = Command.
  make(
    'build-site',
    {

      targetDirectoryPath: Options.directory('target-dir'),

      pathPrefix: Options.directory('path-prefix').
        pipe(Options.optional),

      // Revision flags have effect only if we’re building a Git repo:

      revision: Options.text('rev').
        pipe(Options.repeated, Options.optional),

      currentRevision: Options.text('current-rev').pipe(Options.optional),

      omitRevisionsNewerThanCurrent:
        Options.boolean('omit-revisions-newer-than-current').
        pipe(Options.optional),

      // Override build config (if multiple revisions, for all of them).
      // By default it’s read from source tree.
      buildConfig: Options.file('build-config').pipe(Options.optional),

      ...reportingOptions,
    },
    ({ targetDirectoryPath, pathPrefix, verbose, debug, revision, omitRevisionsNewerThanCurrent, currentRevision }) => pipe(
      Effect.try(() => {
        const config = parseReportingConfig({ verbose, debug })
        return [
          config,
          makeDummyInMemoryCache(),
        ] as [
          ReturnType<typeof parseReportingConfig>,
          ReturnType<typeof makeDummyInMemoryCache>,
        ];
      }),
      Effect.flatMap(([reportingConfig, cache]) => pipe(
        Effect.tryPromise({
          try: () => new Promise((resolve, reject) => {
            const prefix = unpackOption(pathPrefix);
            if (prefix && (!prefix.startsWith('/') || prefix.endsWith('/'))) {
              throw new Error("Path prefix must have a leading slash and no trailing slash");
            }

            let dumping = false;

            async function generate({ onProgress }: { onProgress: TaskProgressCallback }) {
              try {
                const generator = generateSite(
                  {
                    revision: unpackOption(revision)!,
                    omitRevisionsNewerThanCurrent: unpackOption(omitRevisionsNewerThanCurrent)!,
                    currentRevision: unpackOption(currentRevision)!,
                  },
                  (task, progress) => onProgress(`build site|${task}`, progress),
                  cache,
                  {
                    pathPrefix: prefix,
                    debug: {
                      //dumpCache: debug || false,
                      reactDevTools: debug || false,
                      reactStrictMode: debug || false,
                    },
                  },
                );
                const [writeProgress, writingSubtask] = onProgress('build site|write files');
                for await (const blobchunk of generator) {
                  const [subtask] = writingSubtask(Object.keys(blobchunk).join(',').replaceAll('|', ':'), { state: 'writing' });
                  await writeBlobs(targetDirectoryPath, blobchunk);
                  subtask(null);
                }
                writeProgress(null);
                onProgress('build site', null);
                await maybeDumpCache();
                resolve(void 0);
              } catch (e) {
                await maybeDumpCache();
                reject(e);
              } finally {
                // Can’t have maybeDumpCache() here, because we want
                // to call it before resolving/rejecting the promise.
              }
            }

            async function maybeDumpCache() {
              if (dumping || !debug) {
                return;
              }

              return new Promise((resolve, reject) => {
                process.removeListener('SIGINT', maybeDumpCache);
                dumping = true;

                const ac = new AbortController();
                const filename = 'cacheDump.txt';

                try {
                  const stream = fs.createWriteStream(filename, {
                    flags: 'w',
                    autoClose: true,
                    emitClose: true,
                    flush: true,
                    encoding: 'utf-8',
                    signal: ac.signal,
                  });
                  stream.on('close', function handleCloseCacheDumpStream() {
                    console.warn("Cache dump stream close event");
                    resolve(void 0);

                    stream.close(function () {
                      console.warn("Exiting");
                    });
                  });

                  function abortDumpCache() {
                    console.warn("Aborting cache dump");
                    process.removeListener('SIGTERM', abortDumpCache);
                    process.removeListener('SIGINT', abortDumpCache);
                    ac.abort();
                    reject("Aborted");
                  }

                  process.on('SIGTERM', abortDumpCache);
                  process.on('SIGINT', abortDumpCache);

                  stream.on('ready', function handleOpenCacheDumpStream() {
                    console.warn("Dumping cache due to debug flag");
                    cache.dump(stream, ac.signal).then(resolve, reject);
                  });

                  stream.on('error', function handleCacheDumpStreamError(e) {
                    console.error("Error writing cache dump", e);
                    reject(e);
                  });

                } catch (e) {
                  console.error("Could not start cache dump stream", e);
                  reject(e);
                } finally {
                }
              });
            }
            process.on('SIGINT', maybeDumpCache);

            render(<Processor rootTaskName="build site" onStart={generate} />);
          }),
          catch: (e) => {
            console.error(e);
            return new Error(`Error generating site: ${e}`);
          },
        }),
        Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[reportingConfig.logLevel]),
      )),
    ),
  ).
  pipe(
    Command.withDescription("Builds a website using current directory as source."),
  );


const devSite = Command.
  make(
    'develop',
    {
      pkg: Options.directory('package').
        pipe(Options.optional),

      // Useful when site took a long time to generate
      // & we want to iterate on front-end
      skipBuild: Options.boolean('skip-build'),

      // serve: Options.boolean('serve').pipe(
      //   Options.withDefault(false)),

      // port: Options.integer('port').pipe(
      //   Options.withDefault(8080)),
    },
    ({ pkg, skipBuild }) =>
      Effect.
        gen(function * (_) {
          const buildCfg = yield * _(buildSite);

          const { targetDirectoryPath } = buildCfg;

          // Maybe build

          if (!skipBuild) {
            yield * buildSite.handler(buildCfg);
          }


          // Serve
          // (this is not working, possibly Effect API change)
          // if (serve) {
          //   console.debug("Starting serve");
          //   yield * _(
          //     Effect.fork(
          //       Layer.launch(Layer.scopedDiscard(
          //         Effect.gen(function * (_) {
          //           //const srv = yield * _(ServerContext);
          //           const runtime = yield * _(Effect.runtime<never>());
          //           const runFork = Runtime.runFork(runtime);
          //           yield * _(
          //             Effect.acquireRelease(
          //               Effect.sync(() => simpleServe(
          //                 targetDirectoryPath,
          //                 port,
          //                 {
          //                   onDebug: (msg) => runFork(Effect.logDebug(msg)),
          //                   onError: (msg) => runFork(Effect.logError(msg)),
          //                 },
          //               )),
          //               (srv) => Effect.sync(() => srv.close()),
          //             ),
          //           );
          //         })
          //       )),
          //     ),
          //     Logger.withMinimumLogLevel(LogLevel.Debug),
          //   );
          // }


          // Watch

          const packageDir = unpackOption(pkg);
          if (packageDir) {
            const ignorePrefixes = [
              // Spurious changes:
              // Outdir is modified during build
              // and reacting to it would cause infinite rebuilds:
              resolve(targetDirectoryPath),
              '.git',
            ];

            // TODO: Also watch data dir?
            const watchedDirs = [packageDir];

            yield * _(
              debouncedWatcher(watchedDirs, ignorePrefixes, 1000),
              Stream.runForEach(path => Effect.gen(function * (_) {
                yield * _(Effect.logDebug(`Path changed: ${path}`));
                yield * _(Effect.logDebug(`Want to copy ${packageDir} into ${targetDirectoryPath}`));
                yield * _(Effect.all([
                  copyBootstrapScript(packageDir, targetDirectoryPath),
                ], { concurrency: 5 }));
              })),
              Logger.withMinimumLogLevel(LogLevel.Debug),
            );
          }
        })
  ).
  pipe(
    Command.withDescription("Build site in dev mode (watching for changes & copying client-side JS)."),
  );



const main = dispatch.
  pipe(
    Command.withSubcommands([
      buildSite.pipe(Command.withSubcommands([devSite])),
      buildPackage,
    ]),
    Command.run({
      name: "Anafero builder",
      version: "N/A",
    }),
  );


// TODO: Refactor gitdir handling, avoid the global
const gitdir = join(cwd, '.git');

async function areWeInGitRepoRoot(): Promise<boolean> {
  const gitRepoStat = await stat(gitdir);
  if (gitRepoStat.isDirectory()) {
    return true;
  } else {
    return false;
  }
}

async function getFullCommitOID(maybeShortOID: string): Promise<string | null> {
  let expanded: string;
  try {
    expanded = await git.expandOid({ fs, gitdir, oid: maybeShortOID });
  } catch (e) {
    return null;
  }
  const { type, oid } = await git.readObject({ fs, gitdir, oid: expanded });
  return type === 'commit' ? oid : null;
}

async function getCommitTimestamp(oid: string): Promise<Date> {
  const fullOID = await getFullCommitOID(oid);
  if (!fullOID) {
    console.error("Unable get timestamp, maybe not a commit", oid);
    throw new Error("Given OID is not a commit OID");
  }
  const commit = (await git.readObject({ fs, gitdir, oid: fullOID })).object as CommitObject;
  return new Date(commit.committer.timestamp * 1000);
}

/**
 * From a user-provided spec, generates a list of revisions to build
 * as an object { [oid]: VersionMeta }, in no particular order
 * except that current version will always be first.
 */
async function getRefsToBuild(revisionsToBuild: VersionBuildConfig) {

  const refs: Set<string> = new Set();
  for (const revSpec of revisionsToBuild.revision) {
    if (revSpec === 'branches') {
      (await git.listBranches({ fs, gitdir })).map(b => refs.add(b));
    } else if (revSpec === 'tags') {
      (await git.listTags({ fs, gitdir })).map(t => refs.add(t));
    } else {
      refs.add(revSpec);
    }
  }

  const currentVersionOID = (await getFullCommitOID(revisionsToBuild.currentRevision))
    ?? await git.resolveRef({
      fs,
      gitdir,
      ref: revisionsToBuild.currentRevision,
    });

  /** A map of refs to version meta + OID. */
  const versions: Record<string, VersionMeta & { oid: string }> = {
    [revisionsToBuild.currentRevision]: {
      oid: currentVersionOID,
      label: revisionsToBuild.currentRevision,
      timestamp: await getCommitTimestamp(currentVersionOID),
    }
  };

  const requestedOIDsByRef = (await Promise.all(Array.from(refs).
    filter(r => r !== revisionsToBuild.currentRevision).
    map(async (ref) => ({ [ref]:
      (await getFullCommitOID(ref))
      ?? (await git.resolveRef({ fs, gitdir, ref }))
    })
  ))).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const seenOIDs: Set<string> = new Set([currentVersionOID]);
  for (const [ref, oid] of Object.entries(requestedOIDsByRef)) {
    if (!seenOIDs.has(oid)) {
      seenOIDs.add(oid);
      const timestamp = await getCommitTimestamp(oid);
      if (!revisionsToBuild.omitRevisionsNewerThanCurrent
          || timestamp < versions[currentVersionOID]!.timestamp) {
        versions[ref] = { label: ref, timestamp, oid };
      }
    }
  }

  return versions;
}


(global as any).document ??= {
  evaluate: (xpath as any).evaluate,
};
(global as any).XPathResult ??= (xpath as any).XPathResult;


async function * generateSite(
  revisionsToBuild: VersionBuildConfig | undefined,
  onProgress: TaskProgressCallback,
  cache: Cache,
  opts?: {
    pathPrefix?: string | undefined;
    debug?: {
      //dumpCache?: boolean;
      reactDevTools?: boolean;
      reactStrictMode?: boolean;
    };
  },
) {
  if (revisionsToBuild !== undefined) {

    const [versionProgress, ] = onProgress('determine versions to build', {});
    if (!(await areWeInGitRepoRoot())) {
      console.error("Cannot see Git repo, unversioned build is not supported");
      throw new Error("Can’t use revisions outside of Git repo root");
    }
    const refsToBuild = await getRefsToBuild(revisionsToBuild);
    versionProgress(null);

    async function readObject(path: string, opts?: { atVersion?: string }) {
      const ref = opts?.atVersion || revisionsToBuild!.currentRevision;
      const oid = refsToBuild[ref]?.oid;
      if (!oid) {
        throw new Error("Failed to read object: no OID for specified version");
      }
      const gitObject = await git.readBlob({ fs, gitdir, oid, filepath: path });
      if (pointsToLFS(gitObject.blob)) {
        //console.debug("Retrieving blob from LFS", path);
        const pointer = readPointer({
          gitdir,
          content: gitObject.blob,
        });
        const remoteURL = await git.getConfig({ fs, gitdir, path: 'remote.origin.url' });
        return await downloadBlobFromPointer({
          fs,
          url: remoteURL,
          http,
        }, pointer);
      } else {
        return gitObject.blob;
      }
    }

    yield {
      '/bootstrap.js': await readFile(
        join(PACKAGE_ROOT, './bootstrap.js')),
      '/bootstrap.css': await readFile(
        join(PACKAGE_ROOT, './bootstrap.css')),
    };

    if (opts?.debug) {
      yield {
        '/bootstrap.js.map': await readFile(
          join(PACKAGE_ROOT, './bootstrap.js.map')),
        '/bootstrap.css.map': await readFile(
          join(PACKAGE_ROOT, './bootstrap.css.map')),
      };
    }

    yield * generateStaticSiteAssets(
      refsToBuild,
      revisionsToBuild.currentRevision,
      {
        reportProgress: onProgress,
        fetchBlob: readObject,
        fetchDependency,
        getDependencyCSS: (modID) => {
          const maybeCSS = getDependencySupportingFiles()[modID]?.['index.css'];
          return maybeCSS ?? null;
        },
        getDependencySource: (modID) => {
          const source = getDependencySources()[modID];
          if (!source) {
            console.error("Requested dependency source was not found", modID);
            throw new Error("Requested dependency source was not found");
          }
          return source;
        },
        getDOMStub: (() => (new JSDOM('<html></html>')).window.document),
        cache,
        debug: {
          reactStrictMode: opts?.debug?.reactStrictMode || false,
          reactDevTools: opts?.debug?.reactDevTools || false,
        },
        pathPrefix: opts?.pathPrefix,
        decodeXML: (blob) =>
          new JSDOM(
            decoder.decode(blob).replace('xmlns', 'wtf'), // xpath
            { contentType: 'application/xhtml+xml' },
          ).window.document,
        getConfigOverride: async () => null,
      },
    );
  } else {
    throw new Error("Unversioned build is not supported yet");
  }
}


async function writeBlobs(root: string, blobs: Record<string, Uint8Array>) {
  await Promise.all(Object.entries(blobs).map(async ([filePath, fileBlob]) => {
    const fullPath = join(root, filePath);
    //console.debug("Want to write blob", root, filePath, fullPath, dirname(fullPath));
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(join(root, filePath), fileBlob);
  }));
}


const copyBootstrapScript = (packagePath: string, outdir: string) =>
Effect.gen(function * (_) {
  const fs = yield * _(FileSystem.FileSystem);
  const bootstrapFiles = ['bootstrap.js', 'bootstrap.css', 'bootstrap.js.map', 'bootstrap.css.map'];
  yield * _(
    Console.withTime(`Copy generator package from ${packagePath} into ${outdir}`)(
      Effect.all(bootstrapFiles.map(fn =>
        fs.copy(join(packagePath, fn), join(outdir, fn), { overwrite: true })
      ))
    ),
    Effect.orElse(() => Effect.logError("Failed to copy generator package")),
  );
});


const watcherStream = (directory: string) =>
  Stream.
    fromAsyncIterable(
      watch(directory, { recursive: true }),
      (e) => new Error(String(e)),
    ).
    pipe(
      // Omit events without a filename
      Stream.filter(evt => !!evt.filename),
      // Convert events to fully qualified filenames
      Stream.map(evt => resolve(directory, evt.filename!)),
    )

const filteredWatcherStream = (directory: string, ignorePrefixes: string[]) => {
  const fqIgnorePrefixes = ignorePrefixes.map(pref => resolve(pref))
  return (
    watcherStream(directory).
    pipe(
      Stream.filter(path => !fqIgnorePrefixes.find(fqip => path.startsWith(fqip))),
    ));
}

const debouncedWatcher = (
  dirs: string[],
  ignorePrefixes: string[],
  debounce: number,
) =>
  Stream.
    mergeAll(dirs.map(d =>
      filteredWatcherStream(d, ignorePrefixes)), { concurrency: 2 }
    ).
    pipe(
      Stream.debounce(`${debounce} millis`),
    );


export function simpleServe(
  root: string,
  port: number,
  { signal, onDebug, onError }: {
    signal?: AbortSignal,
    onDebug?: (msg: string) => void,
    onError?: (msg: string) => void,
  },
) {
  onDebug?.(`serve: starting server at port ${port}...`);

  const ctypes = new Map([
    ['.html', 'text/html'],
    ['.js', 'text/javascript'],
    ['.mjs', 'text/javascript'],
    ['.css', 'text/css'],
    ['.json', 'application/json'],
    ['.jsonld', 'application/ld+json'],
  ]);

  const server = createServer(async function handleRequest(req, resp) {
    if (!req.url) { return; }
    const rawPath = parseURL(req.url).pathname ?? '/';
    const requestedPath = rawPath ? decodeURIComponent(rawPath) : '/';
    const filename = !requestedPath || requestedPath.endsWith('/')
      ? 'index.html'
      : requestedPath;
    const ctype = ctypes.get(extname(filename)) ?? 'application/octet-stream';
    onDebug?.(`serve: got request for ${filename} (assuming ${ctype})...`);
    try {
      const blob = await readFile(join(root, filename));
      resp.writeHead(200, {'Content-Type': ctype, 'Content-Length': blob.length});
      resp.write(blob, 'binary');
      onDebug?.(`serve: returning ${join(root, filename)} as ${ctype}`);
    } catch (e) {
      const err = String(e);
      if (err.indexOf('ENOENT')) {
        onError?.(`serve: ${req.url}: ${join(root, filename)} does not exist: ${err}`);
        resp.writeHead(404);
      } else {
        onError?.(`serve: failed to handle request of ${req.url}: ${err}`);
        resp.writeHead(500);
      }
    } finally {
      resp.end();
    }
  });

  signal?.addEventListener('abort', function abortServe() {
    onDebug?.("serve: stopping server because of signal...");
    server.closeAllConnections?.();
    return new Promise((resolve, reject) =>
      server.close((err) => err ? reject(err) : resolve(void 0)));
  });

  server.setTimeout(500);
  server.listen(port);

  onDebug?.(`serve: listening at port ${port}`);

  return server;
}
