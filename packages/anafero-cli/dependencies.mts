import { join, basename } from 'path';
import { rmdir, readFile, cp, mkdtemp, stat } from 'fs/promises';
import * as vm from './bun-vm.mjs';
import { tmpdir } from 'os';
import fs from 'fs';

import http from 'isomorphic-git/http/node';
import git from 'isomorphic-git';
import { build } from 'esbuild';

import { Effect, pipe, Console } from 'effect';

// Define the Adapter type locally if it's not available from anafero
interface Adapter {
  // Add necessary properties based on your needs
  [key: string]: any;
}

export type DependencyOptions = {
  /**
   * Adapter-specific options.
   */
  [key: string]: any;
};

export type DependencyResult = {
  /**
   * The adapter.
   */
  adapter: Adapter;
};

/**
 * Fetches a dependency from a URL.
 */
export async function fetchDependency(
  url: string,
  options: DependencyOptions,
): Promise<DependencyResult> {
  // Create a temporary directory
  const dir = await mkdtemp(join(tmpdir(), 'anafero-'));

  try {
    // If the URL is a file URL, copy the file to the temporary directory
    if (url.startsWith('file://')) {
      const path = url.slice(7);
      const stats = await stat(path);
      if (stats.isDirectory()) {
        await cp(path, dir, { recursive: true });
      } else {
        throw new Error(`File ${path} is not a directory`);
      }
    } else {
      // Clone the repository
      await git.clone({
        fs,
        http,
        dir,
        url,
        singleBranch: true,
        depth: 1,
      });
    }

    // Build the adapter
    const result = await buildAdapter(dir);

    return {
      adapter: result.adapter,
    };
  } finally {
    // Clean up the temporary directory
    await rmdir(dir, { recursive: true });
  }
}

/**
 * Builds an adapter from a directory.
 */
async function buildAdapter(dir: string): Promise<{
  adapter: Adapter;
}> {
  // Read the adapter's index.js file
  const indexPath = join(dir, 'index.js');
  const indexContent = await readFile(indexPath, 'utf8');

  // Build the adapter
  const { outputFiles } = await build({
    stdin: {
      contents: indexContent,
      loader: 'js',
      resolveDir: dir,
    },
    write: false,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
  });

  if (!outputFiles || outputFiles.length === 0) {
    throw new Error('Failed to build adapter');
  }

  const code = outputFiles[0].text;

  // Create a context for the adapter
  const context = vm.createContext({
    console,
  });

  // Create a module for the adapter
  const module = new vm.SourceTextModule(code, {
    identifier: 'adapter',
    context,
  });

  // Preloaded modules
  const preloaded: Record<string, any> = {};

  // Link the module
  await module.link(async function link(specifier: string, referencingModule: any) {
    if (specifier.startsWith('https://')) {
      const url = new URL(specifier);
      const code = await fetch(url).then((res) => res.text());
      const module = new vm.SourceTextModule(code, {
        identifier: url.href,
        context,
      });
      return module;
    } else if (specifier.startsWith('node:')) {
      // Node.js built-in modules
      const moduleName = specifier.slice(5);
      const madeAvailable = await import(moduleName);
      const exportNames = Object.keys(madeAvailable);
      const syntheticModule = new vm.SyntheticModule(
        exportNames,
        function (this: vm.SyntheticModule) {
          for (const exportName of exportNames) {
            this.setExport(exportName, madeAvailable[exportName]);
          }
        },
        {
          identifier: specifier,
          context,
        },
      );
      return syntheticModule;
    } else {
      const madeAvailable = preloaded[specifier]
        ? preloaded[specifier]
        // TODO: Don't do the following
        : await import(specifier);
      const exportNames = Object.keys(madeAvailable);
      // Construct a new module from the actual import
      const syntheticModule = new vm.SyntheticModule(
        exportNames,
        function (this: vm.SyntheticModule) {
          for (const exportName of exportNames) {
            this.setExport(exportName, madeAvailable[exportName]);
          }
        },
        {
          identifier: specifier,
          context,
        },
      );
      return syntheticModule;
    }
  });

  // Evaluate the module
  await module.evaluate();

  // Get the adapter from the module
  const adapter = module.namespace.default as Adapter;

  return {
    adapter,
  };
}
