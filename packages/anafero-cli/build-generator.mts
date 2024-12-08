/**
 * Builds/packages up the generator.
 *
 * Used in development/release flow, used by package.json scripts.
 *
 * Depends on Node.
 */

import { resolve, isAbsolute, join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { Logger, Effect } from 'effect';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Command } from '@effect/cli';
import { build as esbuild } from 'esbuild';

import {
  type ReportingOptions,
  parseReportingConfig,
  reportingOptions,
  EFFECT_LOG_LEVELS,
} from './util.mjs';


const PACKAGE_ROOT = resolve(join(import.meta.url.split('file://')[1]!, '..'));


const preparePackage = Command.make('package', reportingOptions, (rawOpts) =>
  Effect.gen(function * (_) {
    const opts = yield * _(Effect.try(() => parseReportingConfig(rawOpts)));
    console.debug("Got opts", opts);
    //yield * _(Effect.tryPromise(() => buildSiteBuilder(opts)));
    yield * _(
      Effect.all([
        //Effect.logDebug(`Using package root: ${PACKAGE_ROOT}`),
        Effect.tryPromise(() => buildSiteBuilder(opts)),
        Effect.tryPromise(() => buildBootstrapScript(opts)),
        //...CONTRIB_SITE_TEMPLATES.map(templateName =>
        //  Effect.tryPromise(() =>
        //    buildSiteTemplate({ ...opts, templateName })
        //  )
        //)
      ], { concurrency: 'unbounded' }),
      Effect.tap(Effect.logDebug("Done building.")),
      Logger.withMinimumLogLevel(EFFECT_LOG_LEVELS[opts.logLevel]),
    );
  })
);

const main = Command.run(
  preparePackage,
  {
    name: "Anafero generator builder (internal script)",
    version: "N/A",
  },
);

Effect.
  suspend(() => main(process.argv.slice(2))).
  pipe(
    Effect.provide(NodeContext.layer),
    NodeRuntime.runMain);

//console.debug(require.resolve('jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js'))


async function buildBootstrapScript(opts: ReportingOptions) {
  const { logLevel } = opts;
  return await esbuild({
    entryPoints: [
      './bootstrap.tsx',
      //join(PACKAGE_ROOT, 'site', 'index.tsx'),
    ],
    absWorkingDir: join(PACKAGE_ROOT, '..', 'firelight-gui'),
    entryNames: '[dir]/[name]',
    assetNames: '[dir]/[name]',
    format: 'esm',
    target: ['esnext'],
    bundle: true,
    minify: false,
    treeShaking: true,
    sourcemap: true,
    platform: 'browser',
    outfile: join(PACKAGE_ROOT, 'bootstrap.js'),
    //outdir: 'layout',
    write: true,
    loader: {
      '.module.css': 'local-css',
      '.css': 'css',
      // '.jpg': 'file',
      // '.png': 'file',
    },
    logLevel,
  });
}

/**
 * Builds the entry point for site build CLI command.
 *
 * NOTE: It bundles all deps into that file.
 * That may be suboptimal, since it results in a >1MB size .js script.
 * However, it makes NPX invocation faster since we have no runtime
 * dependencies, only devDependencies. Also, I couldn’t figure out
 * how to properly import runtime dependencies from a packace.json’s bin.
 */
async function buildSiteBuilder(opts: ReportingOptions) {
  const { logLevel } = opts;
  return await esbuild({
    entryPoints: [
      'generate-to-filesystem.tsx',
      //join(PACKAGE_ROOT, 'site', 'index.tsx'),
    ],
    entryNames: '[dir]/[name]',
    assetNames: '[dir]/[name]',
    format: 'esm',
    target: ['esnext'],
    bundle: true,

    external: [
      // JSDOM thing?
      'canvas',
      'esbuild-wasm',

      // Ink thing :/
      'yoga-wasm-web',
      'react-devtools-core',
    ],

    define: {
     'process.env.DEV': 'false',
    },
    
    loader: {
      '.css': 'local-css',
    },

    minify: false,
    treeShaking: true,
    sourcemap: false,
    platform: 'node',
    banner: {
      js: "import { createRequire as _createRequire } from \"node:module\"; const require = _createRequire(import.meta.url);",
    },
    outfile: 'build-site.mjs',
    write: true,
    //loader: {
    //  //'.css': 'local-css',
    //  // '.jpg': 'file',
    //  // '.png': 'file',
    //},
    logLevel,
    inject: ['cjs-shim.ts'],
    plugins: [{
      name: 'jsdom-patch',
      setup(build) {
        build.onLoad({ filter: /XMLHttpRequest-impl\.js$/ }, async (args) => {
          let contents = await readFile(args.path, 'utf8');
          contents = contents.replace(
            'const syncWorkerFile = require.resolve ? require.resolve("./xhr-sync-worker.js") : null;',
            `const syncWorkerFile = "${import.meta.resolve('jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js')}";`.replaceAll('\\', process.platform === 'win32' ? '\\\\' : '\\'),
          );
          return { contents, loader: 'js' };
        });
      },
    }, {
      // TODO: this may be unnecessary because we no longer try to bundle esbuild-wasm
      name: 'wasm',
      setup(build) {
        // Resolve ".wasm" files to a path with a namespace
        build.onResolve({ filter: /\.wasm$/ }, args => {
          console.debug("HAVE A WASM");

          // If this is the import inside the stub module, import the
          // binary itself. Put the path in the "wasm-binary" namespace
          // to tell our binary load callback to load the binary file.
          //if (args.namespace === 'wasm-stub') {
            return {
              path: args.path,
              namespace: 'wasm-binary',
            }
          //}

          // Otherwise, generate the JavaScript stub module for this
          // ".wasm" file. Put it in the "wasm-stub" namespace to tell
          // our stub load callback to fill it with JavaScript.
          //
          // Resolve relative paths to absolute paths here since this
          // resolve callback is given "resolveDir", the directory to
          // resolve imports against.
          if (args.resolveDir === '') {
            return // Ignore unresolvable paths
          }
          return {
            path: isAbsolute(args.path)
              ? args.path
              : join(args.resolveDir, args.path),
            namespace: 'wasm-stub',
          }
        })

        // Virtual modules in the "wasm-stub" namespace are filled with
        // the JavaScript code for compiling the WebAssembly binary. The
        // binary itself is imported from a second virtual module.
        build.onLoad({ filter: /.*/, namespace: 'wasm-stub' }, async (args) => ({
          contents: `import wasm from ${JSON.stringify(args.path)}
            export default (imports) =>
              WebAssembly.instantiate(wasm, imports).then(
                result => result.instance.exports)`,
        }))

        // Virtual modules in the "wasm-binary" namespace contain the
        // actual bytes of the WebAssembly file. This uses esbuild's
        // built-in "binary" loader instead of manually embedding the
        // binary data inside JavaScript code ourselves.
        build.onLoad({ filter: /.*/, namespace: 'wasm-binary' }, async (args) => ({
          contents: await readFile(args.path),
          loader: 'binary',
        }))
      },
    }],
  });
}

// const plugin = {
//   name: 'require-to-import',
//   setup({ onResolve, onLoad, esbuild }) {
//     function matchBrace(text: string, from: number) {
//       if (!(text[from] === '(')) return -1;
//       let i, k = 1;
//       for (i = from + 1; i < text.length && k > 0; ++i) {
//         if (text[i] === '(') k++;
//         if (text[i] === ')') k--;
//       }
//       let to = i - 1;
//       if (!(text[to] === ')') || k !== 0) return -1;
//       return to;
//     }
// 
//     function makeName(path: string) {
//       return path.replace(/-(\w)/g, (_, x) => x.toUpperCase())
//                  .replace(/[^$_a-zA-Z0-9]/g, '_');
//     }
// 
//     onLoad({ filter: /\.c?js/ }, async args => {
//       let contents = await readFile(args.path, 'utf8')
//       const { warnings } = await esbuild.transform(contents, { format: 'esm', logLevel: 'silent' })
//       let lines = contents.split('\n')
//       if (warnings && warnings.some(e => e.text.includes('"require" to "esm"'))) {
//         let modifications: [number, number, string][] = [], imports = []
//         for (const { location } of warnings.filter(w => w.location !== null)) {
//           const { line, lineText, column, length } = location!;
//           // "require|here|("
//           let left = column + length
//           // "require('a'|here|)"
//           let right = matchBrace(lineText, left)
//           if (right === -1) continue;
//           // "'a'"
//           let raw = lineText.slice(left + 1, right)
//           let path
//           try {
//             // 'a'
//             path = eval(raw) // or, write a real js lexer to parse that
//             if (typeof path !== 'string') continue; // print warnings about dynamic require
//           } catch (e) {
//             continue
//           }
//           let name = `__import_${makeName(path)}`
//           // "import __import_a from 'a'"
//           let import_statement = `import ${name} from ${raw};`
//           // rewrite "require('a')" -> "__import_a"
//           let offset = lines.slice(0, line - 1).map(line => line.length).reduce((a, b) => a + 1 + b, 0)
//           modifications.push([offset + column, offset + right + 1, name])
//           imports.push(import_statement)
//         }
//         if (imports.length === 0) return null;
//         imports = [...new Set(imports)]
//         let offset = 0
//         for (const [start, end, name] of modifications) {
//           contents = contents.slice(0, start! + offset) + name + contents.slice(end! + offset)
//           offset += name.length - (end - start)
//         }
//         contents = [...imports, 'module.exports', contents].join(';') // put imports at the first line, so sourcemaps will be ok
//         return { contents }
//       }
//       return;
//     })
//   }
// }
