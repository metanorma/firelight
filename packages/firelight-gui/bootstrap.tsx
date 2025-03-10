import { ImportMapper } from 'import-mapper';
import React from 'react';
import { Helmet } from 'react-helmet';
import { hydrateRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import ErrorBoundaryWithCustomFallback from 'anafero/ErrorBoundaryWithCustomView.jsx';
import { AppLoader } from './App.jsx';


setTimeout(initApp, 50);

// Patch lunr
import lunr from 'lunr';

// - https://github.com/olivernn/lunr.js/issues/279#issuecomment-2539409162
// - https://github.com/olivernn/lunr.js/issues/503
declare global {
  namespace lunr {
    interface TokenSet {
      _str: string;
      final: boolean;
      edges: Record<string, lunr.TokenSet>;
      id: number;
    }
  }
}
lunr.TokenSet.prototype.toString = function () {
  if (this._str) {
    return this._str;
  }

  let str = this.final ? '1' : '0',
    labels = Object.keys(this.edges).sort(),
    len = labels.length;

  for (var i = 0; i < len; i++) {
    let label = labels[i], node = label ? this.edges[label] : undefined;
    if (node) {
      str = str + ', L(' + label + ')I(' + node.id + ')';
    }
  }

  return str;
};
// End patch lunr


function initApp () {

  const appRoot = document.getElementById('app');

  if (!appRoot) {
    console.error("Can’t initialize the app: missing root");
    return;
  }

  setUpExtensionImportMap();

  const useStrictMode = document.documentElement.dataset.useReactStrict === 'true';

  const originalHTML = appRoot.innerHTML;

  // Fixing body height helps avoid a flash when user opens
  // a subresource (URL with a hash fragment) from outside.
  // Browser hits SSR with the requisite ID, and when tree is replaced
  // by React for an instant apparently body height collapses.
  // There may be a better way to avoid this.
  // The preferable way to avoid this is likely be clean hydration,
  // but it appears to be unachievable(?).
  document.body.style.height = `${appRoot.clientHeight}px`;

  // If there’s an error, this will fall back to SSR’d DOM.
  const app =
    <ErrorBoundaryWithCustomFallback fallback={<div
      dangerouslySetInnerHTML={{ __html: originalHTML }}
      suppressHydrationWarning={true}
    />}>
      <AppLoader />
    </ErrorBoundaryWithCustomFallback>;

  hydrateRoot(
    appRoot!,
    useStrictMode
      ? <StrictMode>{app}</StrictMode>
      : app,
  );

  const observer = new MutationObserver(function cleanUpLoad() {
    const hasInitialized = !!document.documentElement.getAttribute('data-react-helmet');
    if (hasInitialized) {
      //console.debug("Cleaning up");

      // Safe to assume that after data-react-helmet attribute shows up,
      // React’s DOM tree is up?
      setTimeout(() => document.body.style.removeProperty('height'), 500);
      observer.disconnect();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    childList: false,
    characterData: false,
    subtree: false,
  });

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
