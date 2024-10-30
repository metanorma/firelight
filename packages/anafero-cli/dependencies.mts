import { join, basename } from 'node:path';
import { rmdir, readFile, cp, mkdtemp } from 'node:fs/promises';
import vm, { type Module as VMModule } from 'node:vm';
import { tmpdir } from 'node:os';

import fetch from 'node-fetch';
import { build as esbuild } from 'esbuild-wasm';

import { JSDOM } from 'jsdom';
import xpath from 'xpath';

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



const getDoc = () => {
  const doc = (new JSDOM('<html></html>')).window.document;
  doc.evaluate = (xpath as any).evaluate;
  return doc;
};


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
 * Doesn’t really do validation of T.
 */
export async function fetchDependency<T>(moduleRef: string):
Promise<T> {
  if (depRegistry[moduleRef]) {
    return await depRegistry[moduleRef] as T;
  }
  depRegistry[moduleRef] = async function resolveDep() {
    const localPath = moduleRef.split('file:')[1];
    if (!localPath) {
      throw new Error("Only dependencies on local filesystem are supported for now.");
    }

    const buildDir = await mkdtemp(join(tmpdir(), 'firelight-dependency'));

    console.debug(
      "Building dependency from local path",
      localPath);

    console.debug(
      "Copying into build dir",
      buildDir);

    await cp(localPath, buildDir, { recursive: true });

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
