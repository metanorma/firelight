import { join, basename } from 'node:path';
import { readdir, rmdir, readFile, cp, mkdtemp, stat, mkdir, writeFile } from 'node:fs/promises';
import vm, { type Module as VMModule } from 'node:vm';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

import http from 'isomorphic-git/http/node';
import git from 'isomorphic-git';

import fetch from 'node-fetch';
import { build as esbuild } from 'esbuild-wasm';

import { JSDOM } from 'jsdom';
import xpath from 'xpath';

import { parseModuleRef, type DependencyResolver } from 'anafero/index.mjs';
import { type Progress } from 'anafero/progress.mjs';

// Made available to fetched dependencies but for now
// we don’t leave it up to import because of workspace packaging hassle.
import * as anafero from 'anafero/index.mjs';
import * as pmModel from 'prosemirror-model';
import * as pmTables from 'prosemirror-tables';
import * as pmSchemaList from 'prosemirror-schema-list';
import * as helmet from 'react-helmet';
import * as react from 'react';
const preloaded = {
  'anafero/index.mjs': anafero,
  'prosemirror-model': pmModel,
  'prosemirror-tables': pmTables,
  'prosemirror-schema-list': pmSchemaList,
  'react-helmet': helmet,
  'react': react,
} as Readonly<Record<string, unknown>>;


const depRegistry: Record<string, Promise<unknown>> = {};
const dependencySources: Record<string, string> = {};
const dependencySupportingFiles: Record<string, Record<string, Uint8Array>> = {};


const tmpRoot = tmpdir();



const getDoc = () => {
  const doc = (new JSDOM('<html></html>')).window.document;
  doc.evaluate = (xpath as any).evaluate;
  return doc;
};

/**
 * Maps module refs (without subdirectories)
 * to paths on local filesystem, to avoid cloning the same
 * repo multiple times if it contains multiple dependencies
 * in use by the project.
 */
const dependencyRepositories: Record<string, string> = {} as const;

/** Should be called after all is done. */
export async function cleanUpRepositories() {
  for (const dir of Object.values(dependencyRepositories)) {
    if (dir.startsWith(tmpRoot)) {
      await rmdir(dir);
    } else {
      console.warn("Not cleaning up dir (not a child of temporary root)", dir);
    }
  }
}

/**
 * Retrieves module from a Git repository based on specified
 * URL & OID & subdir. Returns path to module source on local filesystem.
 */
async function fetchSourceFromGit(
  moduleRef: string,
  onProgress: (progress: Progress) => void,
): Promise<string> {
  const [url, ref, subdir] = parseModuleRef(moduleRef);

  const alreadyClonedKey = [url, ref].join('#');
  if (!dependencyRepositories[alreadyClonedKey]) {
    const dir = await mkdtemp(join(
      tmpRoot,
      `anafero-source-${moduleRef.replace(/[^a-z0-9]/gi, '_')}-`,
    ));

    onProgress({ state: `cloning ${url} at ${ref} to ${dir}` });

    await git.clone({
      fs,
      http,
      dir,
      url,
      ref,
      depth: 1,
      onProgress: function handleCloneProgress(progress) {
        onProgress({
          state: `cloning: ${progress.phase}`,
          total: progress.total,
          done: progress.loaded,
        });
      }
    });

    dependencyRepositories[alreadyClonedKey] = dir;
  } else {
    onProgress({ state: `already cloned ${moduleRef}` });
  }
  const clonePath = dependencyRepositories[alreadyClonedKey];

  if (subdir) {
    const presumedSubdir = join(clonePath, `/${subdir}`);
    const subdirStat = await stat(presumedSubdir);
    if (subdirStat.isDirectory()) {
      return presumedSubdir;
    } else {
      throw new Error("Fetched Git repository doesn’t have the subdirectory in module ref");
    }
  } else {
    return clonePath;
  }
}


export function getDependencySources() {
  return dependencySources;
}

export function getDependencySupportingFiles() {
  return dependencySupportingFiles;
}


const decoder = new TextDecoder();


/**
 * Given a module reference (URI), fetches and provides a tuple
 * with instantiated module and a map of any other generated files.
 * NOTE: Doesn’t really validate that returned module conforms to anything.
 *
 * Handles caching (if a module was already requested, will resolve
 * the same promise).
 *
 * This currently relies on Node, and is therefore here in the CLI module;
 * see TODO about resolveDir about making dependencies buildable
 * in the browser.
 */
export const fetchDependency: DependencyResolver =
async function fetchDependency(
  moduleRef,
  onProgress,
) {

  if (!depRegistry[moduleRef]) {
    depRegistry[moduleRef] = async function resolveDep() {
      let sourceDir: string;

      const localPath = moduleRef.split('file:')[1];
      if (!localPath) {
        //throw new Error("Only dependencies on local filesystem are supported for now.");
        onProgress({ state: `fetching ${moduleRef} to ${localPath}` });
        sourceDir = await fetchSourceFromGit(moduleRef, onProgress);
      } else {
        sourceDir = localPath;
      }

      const [bundledCode, otherFiles] = await getDependencyAssets(
        moduleRef,
        sourceDir,
        onProgress,
      );

      const code = decoder.decode(bundledCode);

      onProgress({ state: "instantiating module" });

      // const fn = `${process.cwd()}/test.js`;
      // console.debug("Will write to", fn);
      // await writeFile(fn, result.outputFiles[0]!.contents, { encoding: 'utf-8' })

      const context = vm.createContext({
        Array,
        Object,
        crypto,
        XPathResult,
        document: getDoc(),
        console,
        Function,
        setTimeout,
        clearTimeout,
        setInterval,
        TextEncoder,
        TextDecoder,
        Blob,
        btoa,
        atob,
      });
      const mod = new vm.SourceTextModule(code, {
        // TODO: Try moduleRef as VM module identifier?
        // Take care of special characters, though.
        identifier: 'anafero-dependency',
        context,
      });

      async function link(specifier: string, referencingModule: VMModule) {
        const isAbsoluteURL = specifier.startsWith('https://');
        let base: string | undefined;
        try {
          new URL(referencingModule.identifier);
          base = referencingModule.identifier;
          // The module that does the importing is referenced by URL.
        } catch (e) {
          // The module that does the importing is not referenced by URL.
          base = undefined;
        }
        const isRelativePath =
          specifier.startsWith('/')
          || specifier.startsWith('./')
          || specifier.startsWith('../');
        const isRelativeURL = isRelativePath && base !== undefined;

        if (isAbsoluteURL || isRelativeURL) {
          // Create a new absolute URL from the imported
          // module's URL (specifier) and the parent module's
          // URL (referencingModule.identifier).
          //console.debug("anafero: building module URL", specifier, 'imported from', referencingModule.identifier);
          if (isRelativeURL && base === undefined) {
            throw new Error("Unable to resolve relative specifier without a base");
          }
          const url = new URL(specifier, base).toString();
          // Download the raw source code.
          //console.debug("anafero: fetching module", url);
          const source = await (await fetch(url)).text();
          // TODO: Fetched source needs to be cached appropriately
          // Version needs to be taken into account?

          // Instantiate a new module and return it.
          return new vm.SourceTextModule(source, {
            identifier: url,
            context: referencingModule.context,
          });
        } else {
          //console.debug("anafero: fetching preloaded", specifier);
          const madeAvailable = preloaded[specifier]
            ? preloaded[specifier]
            // TODO: Don’t do the following
            : await import(specifier);
          const exportNames = Object.keys(madeAvailable);
          // Construct a new module from the actual import
          return new vm.SyntheticModule(
            exportNames,
            function () {
              for (const name of exportNames) {
                this.setExport(name, madeAvailable[name]);
              }
            },
            { 
              identifier: specifier,
              context: referencingModule.context,
            },
          );
        }
      }

      await mod.link(link);

      await mod.evaluate();

      const defaultExport = (mod.namespace as any).default as any;

      dependencySources[moduleRef] = code;
      dependencySupportingFiles[moduleRef] = otherFiles;

      return defaultExport;

      // It would be nice if this did work…
      //let module = {};
      //const req = (pkg: string) => {
      //  console.debug("REQUIRED", pkg);
      //  const result = import(pkg);
      //  console.debug("GOT", result);
      //  return result;
      //};
      //console.debug((new Function('module', 'require', decoder.decode(result.outputFiles[0]!.contents)))(module, req));
      //const out = await import(fn);
      //console.debug(out.name);
      //throw new Error("TODO");
      //const data = await readFile(outfile, { encoding: 'utf-8' });
      //return new Function(data);
    }();
  }

  return await depRegistry[moduleRef] as any;
};


/**
 * Builds dependency from TypeScript if needed,
 * returns dependency source as string.
 *
 * Does not cache anything.
 */
async function getDependencyAssets(
  moduleRef: string,
  sourceDirPath: string,
  onProgress: (progress: Progress) => void,
): Promise<[
  dependency: Uint8Array,
  assets: Record<string, Uint8Array>,
]> {
  if (await isPreBuilt(sourceDirPath)) {
    console.debug("Using pre-built", moduleRef);
    return await readPreBuiltDependency(sourceDirPath);
  } else {
    return await buildDependency(moduleRef, sourceDirPath, onProgress);
  }
}


function getPreBuiltRoot(sourceDirPath: string): string {
  return join(sourceDirPath, 'dist');
}


async function readPreBuiltJSBundle(sourceDirPath: string):
Promise<Uint8Array> {
  const bundlePath = join(
    getPreBuiltRoot(sourceDirPath),
    PRE_BUILT_JS_BUNDLE_FILENAME);
  const bundleStat = await stat(bundlePath);
  if (bundleStat.isFile()) {
    return readFile(bundlePath);
  } else {
    throw new Error("Pre-built entry point is not a file");
  }
}


const PRE_BUILT_JS_BUNDLE_FILENAME = 'index.js';


async function readPreBuiltAssets(sourceDirPath: string):
Promise<Record<string, Uint8Array>> {
  const distroot = getPreBuiltRoot(sourceDirPath);
  const filenames = await readdir(distroot);
  const assets = filenames.filter(fn => fn !== PRE_BUILT_JS_BUNDLE_FILENAME);
  return (
    (await Promise.all(
      assets.map(async (fn) => ({ [fn]: await readFile(join(distroot, fn)) }))
    )).
    reduce((prev, curr) => ({ ...prev, ...curr }), {})
  );
}


export async function writePreBuiltAssets(
  sourceDirPath: string,
  bundledCode: Uint8Array,
  assets: Record<string, Uint8Array>,
) {
  const distDir = getPreBuiltRoot(sourceDirPath);
  await mkdir(distDir);
  console.debug("Writing index.js");
  await writeFile(join(distDir, PRE_BUILT_JS_BUNDLE_FILENAME), bundledCode);
  for (const [fn, blob] of Object.entries(assets)) {
    console.debug("Writing asset", fn);
    await writeFile(join(distDir, fn), blob);
  }
}


async function isPreBuilt(sourceDirPath: string): Promise<boolean> {
  try {
    // A pre-built dependency contains directory “dist”
    // with index.js and possibly other assets.
    // Subdirectories under dist are ignored.
    await readPreBuiltJSBundle(sourceDirPath);
    await readPreBuiltAssets(sourceDirPath);
    return true;
  } catch (e) {
    return false;
  }
}


async function readPreBuiltDependency(
  sourceDirPath: string,
): Promise<[
  bundledCode: Uint8Array,
  supportingAssets: Record<string, Uint8Array>,
]> {
  return [
    await readPreBuiltJSBundle(sourceDirPath),
    await readPreBuiltAssets(sourceDirPath),
  ];
}


export async function buildDependency(
  /**
   * Acts only as cache key to avoid build directories clashing.
   */
  moduleRef: string,
  sourceDir: string,
  onProgress: (progress: Progress) => void,
): Promise<[
  bundledCode: Uint8Array,
  supportingAssets: Record<string, Uint8Array>,
]> {
  const buildDir = await mkdtemp(join(
    tmpRoot,
    `anafero-dist-${moduleRef.replace(/[^a-z0-9]/gi, '_')}-`,
  ));

  onProgress({ state: `copying into build dir ${buildDir}` });

  await cp(sourceDir, buildDir, { recursive: true });

  //const outfile = join(buildDir, 'out.mjs');
  //await esbuildTransform('oi');

  onProgress({ state: "compiling" });

  const result = await esbuild({
    //entryPoints: [join(buildDir, 'index.mts')],
    stdin: {
      contents: await readFile(join(buildDir, 'index.mts')),
      loader: 'ts',

      // TODO: This means we use filesystem when resolving
      // imports in the entry point. That’s not great, if we
      // want to build e.g. in the browser.
      // It may be possible to avoid this by writing a custom
      // resolver plugin for esbuild. See
      // - https://github.com/evanw/esbuild/issues/591#issuecomment-742962090
      // - https://esbuild.github.io/plugins/#on-resolve-arguments
      resolveDir: buildDir,

      sourcefile: 'index.mts',
    },
    loader: {
      '.mts': 'ts',
      '.css': 'local-css',
    },
    entryNames: '[dir]/[name]',
    assetNames: '[dir]/[name]',
    format: 'esm',
    target: ['es2022'],
    tsconfigRaw: '{}',
    //external: [],
    packages: 'external',
    //plugins: [{
    //  name: 'plugin-resolver',
    //  setup(build) {
    //    build.onLoad({ filter: /^prosemirror-model-metanorma/ }, args => {
    //      return import(args.path);
    //    });
    //  },
    //}],
    minify: false,
    platform: 'browser',
    write: false,
    logLevel: 'silent',
    //logLevel: 'info',
    sourcemap: true,
    bundle: true,
    outfile: 'index.js',
    treeShaking: true,
    //outfile,
  });

  onProgress({ state: `removing build dir ${buildDir}` });
  await rmdir(buildDir, { recursive: true });

  const otherFiles: Record<string, Uint8Array> = {};

  const mainOutput = result.outputFiles.
    find(({ path }) => basename(path) === 'index.js')?.contents;

  if (!mainOutput) {
    throw new Error("Fetching dependency: no main output after building");
  } else if (result.outputFiles.length > 1) {
    for (const { path, contents } of result.outputFiles) {
      if (!path.endsWith('/index.js')) {
        otherFiles[basename(path)] = contents;
      }
    }
  }

  return [mainOutput, otherFiles];
}
