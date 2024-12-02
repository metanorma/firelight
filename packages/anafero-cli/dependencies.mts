import { join, basename } from 'node:path';
import { rmdir, readFile, cp, mkdtemp, stat } from 'node:fs/promises';
import * as S from 'effect/Schema';
import vm, { type Module as VMModule } from 'node:vm';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

import http from 'isomorphic-git/http/node';
import git, { type CommitObject } from 'isomorphic-git';

import fetch from 'node-fetch';
import { build as esbuild } from 'esbuild-wasm';

import { JSDOM } from 'jsdom';
import xpath from 'xpath';

import { GitModuleRefSchema } from 'anafero/index.mjs';

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
} as Record<string, unknown>;


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
): Promise<string> {
  const parts = S.decodeUnknownSync(GitModuleRefSchema)(moduleRef);
  const url = `https://${parts[1]}`;
  const refAndMaybeSubdir = parts[3];
  const [ref, subdir]: [string, string | undefined] = refAndMaybeSubdir.indexOf('/') > 0
    ? [refAndMaybeSubdir.split('/')[0]!, refAndMaybeSubdir.slice(refAndMaybeSubdir.indexOf('/'))]
    : [refAndMaybeSubdir, undefined];

  const alreadyClonedKey = [url, ref].join('#');
  if (!dependencyRepositories[alreadyClonedKey]) {
    const dir = await mkdtemp(join(
      tmpRoot,
      `anafero-source-${moduleRef.replace(/[^a-z0-9]/gi, '_')}-`,
    ));

    console.debug("Cloning moduleRef", moduleRef, "to dir", dir);

    await git.clone({
      fs,
      http,
      dir,
      url,
      ref,
      depth: 1,
    });

    dependencyRepositories[alreadyClonedKey] = dir;
  } else {
    console.debug("Already cloned", moduleRef);
  }
  const clonePath = dependencyRepositories[alreadyClonedKey];

  if (subdir) {
    const presumedSubdir = join(clonePath, `/${subdir}`);
    console.debug("STATTING SUBDIR", presumedSubdir);
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
 * NOTE: Doesn’t really do validation of T.
 *
 * This currently relies on Node, and is therefore in the CLI module,
 * see TODO about resolveDir about making dependencies buildable
 * in the browser.
 */
export async function fetchDependency<T>(moduleRef: string):
Promise<T> {
  if (depRegistry[moduleRef]) {
    return await depRegistry[moduleRef] as T;
  }
  depRegistry[moduleRef] = async function resolveDep() {
    let sourceDir: string;

    const localPath = moduleRef.split('file:')[1];
    if (!localPath) {
      //throw new Error("Only dependencies on local filesystem are supported for now.");
      sourceDir = await fetchSourceFromGit(moduleRef);
      console.debug("Fetched to path", localPath);
    } else {
      sourceDir = localPath;
    }

    const buildDir = await mkdtemp(join(
      tmpRoot,
      `anafero-dist-${moduleRef.replace(/[^a-z0-9]/gi, '_')}-`,
    ));

    console.debug(
      "Building dependency from source dir",
      sourceDir);

    console.debug(
      "Copying into build dir",
      buildDir);

    await cp(sourceDir, buildDir, { recursive: true });

    //const outfile = join(buildDir, 'out.mjs');
    //await esbuildTransform('oi');

    console.debug(
      "Building with esbuild",
      moduleRef);

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
      logLevel: 'info',
      sourcemap: true,
      bundle: true,
      outfile: 'index.js',
      treeShaking: true,
      //outfile,
    });

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

    const code = decoder.decode(mainOutput);

    console.debug(
      "Built with esbuild, instantiating…",
      moduleRef);

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
      setInterval,
    });
    const mod = new vm.SourceTextModule(code, {
      identifier: 'test',
      context,
    });

    async function link(specifier: string, referencingModule: VMModule) {
      if (specifier.startsWith('https://')) {
        // Create a new absolute URL from the imported
        // module's URL (specifier) and the parent module's
        // URL (referencingModule.identifier).
        const url = new URL(
          specifier,
          referencingModule.identifier,
        ).toString();
        // Download the raw source code.
        const source = await (await fetch(url)).text();
        // Instantiate a new module and return it.
        return new vm.SourceTextModule(source, {
          identifier: url,
          context: referencingModule.context,
        });
      } else {
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

    console.debug("Instantiated", defaultExport.name, defaultExport.version);
    console.debug("Removing build dir", buildDir);

    await rmdir(buildDir, { recursive: true });

    dependencySources[moduleRef] = code;
    dependencySupportingFiles[moduleRef] = otherFiles;

    return defaultExport as T;

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
  return await depRegistry[moduleRef] as T;
}
