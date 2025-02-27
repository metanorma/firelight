import { ImportMapper } from 'import-mapper';
import React from 'react';
import { Helmet } from 'react-helmet';
import { hydrateRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { AppLoader } from './App.jsx';


setTimeout(initApp, 50);


async function initApp () {

  const appRoot = document.getElementById('app');

  if (!appRoot) {
    console.error("Can’t initialize the app: missing root");
  }

  setUpExtensionImportMap();

  const useStrictMode = document.documentElement.dataset.useReactStrict === 'true';

  hydrateRoot(
    appRoot!,
    useStrictMode
      ? <StrictMode><AppLoader /></StrictMode>
      : <AppLoader />,
  );

};


// TODO: Support making different imports available based on host version.
// The tricky part is avoiding having to bundle imports for all past versions.
// We probably can’t avoid it if we just support the version as a parameter,
// so that’s unacceptable, but it can probably be done by providing
// a bootstrap script for each version.
// It could probably be automated at build-generator level.

/** Returns an object with supported imports. */
async function getExtensionImports(): Promise<Record<string, unknown>> {
  return {
    'react': { default: React },
    'prosemirror-model': await import('prosemirror-model'),
    'xpath': await import('xpath'),
    '@effect/schema/Schema': await import('@effect/schema/Schema'),
    'prosemirror-tables': await import('prosemirror-tables'),
    'prosemirror-schema-list': await import('prosemirror-schema-list'),
    'react-helmet': { Helmet },
    'anafero/index.mjs': await import('anafero/index.mjs'),
  };
}

let registered = false;

/**
 * Uses importMapper to make select dependencies available within code
 * that was dynamically `import()`ed from an object URL.
 */
async function setUpExtensionImportMap() {
  const deps = await getExtensionImports();

  if (registered) {
    return deps;
  }

  const imports: Record<string, string> = {};
  for (const [moduleID, moduleData] of Object.entries(deps)) {
    const m = moduleData as any;
    //console.debug("processing import", moduleID, m);
    const d = m.default // && Object.keys(m).length === 1 // only default export
      ? ImportMapper.forceDefault(m.default)
      : null;
    if (d || moduleData) {
      imports[moduleID] = d ?? moduleData;
    }
  }

  const mapper = new ImportMapper(imports);
  mapper.register();

  registered = true;

  return deps;
}
