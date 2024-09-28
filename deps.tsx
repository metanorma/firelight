import { Effect } from 'effect';
import * as S from '@effect/schema/Schema';

// interface Dependency {
//   /** */
//   validateParams: () => boolean;
//   getDescription: () => string;
//   version: string;
// }

const DependencySchema = S.Struct({
  version: S.String.pipe(S.nonEmptyString()),
  description: S.String.pipe(S.nonEmptyString()),
  configurationWarnings: S.String.pipe(S.nonEmptyString(), S.optional),
});

export type Dependency = S.Schema.Type<typeof DependencySchema>;

function constructDependency(source: string, params: unknown) {
  return Effect.gen(function * (_) {
    const dep = yield * _(Effect.try(() => new Function(source)(params)));
    return yield * _(S.decodeUnknown(DependencySchema)(dep));
  });
}

export interface Reader {
}

export interface Look {
  getComponentLibrary: () => ComponentLibrary;
}

/** Maps XPath to React components for customization. */
export type ComponentLibrary = Record<string, React.FC>;

export interface Layout {
  layout: (source: Document, library: ComponentLibrary) => JSX.Element;
}

export interface Renderer {
  /**
   * Transforms document’s JSX tree into objects keyed by paths.
   *
   * Each yielded value would contain one or more paths,
   * mapped to respective object data.
   *
   * Object data is a binary array of arbitrary contents,
   * and its path a POSIX-style slash-separated string.
   *
   * Consumers can stream result into files on local filesystem
   * (assuming paths don’t contain unsupported characters),
   * pack it into an archive and initiate a download
   * when complete, etc.
   */
  render: (
    documentRoot: JSX.Element,
  ) => AsyncIterator<Record<string, Uint8Array>>;
}


export function resolveDependency (
  identifier: string,
  params: string | undefined,
  tmpdir: string,
  opts?: { override?: string | undefined },
) {
  return Effect.gen(function * (_) {
    const source = 'foobar';

    // const data = yield * _(
    //   fs.readFileString(datasetMetaPath),
    //   Effect.map(parseYAML),
    //   Effect.flatMap(f => S.decodeUnknown(PaneronDataset)(f)),
    // );

    // const devModeExtensionDir = opts?.devModeExtensionDirectory;
    // const extensionURLs = getExtensionURLs(data.type.id, devModeExtensionDir);

    // const packageJsonOut = join(outdir, 'package.json');
    // const esbuiltSourceOut = join(outdir, 'extension.js');

    // yield * _(
    //   Effect.all([
    //     Console.withTime(`Fetch extension code from ${extensionURLs.esbuiltSource} to ${esbuiltSourceOut}`)(
    //       pipe(
    //         fetchMaybeLocalDependency(extensionURLs.esbuiltSource),
    //         Effect.flatMap(S.decodeUnknown(S.String)),
    //         Effect.flatMap(source =>
    //           fs.writeFileString(join(outdir, 'extension.js'), source)),
    //       )
    //     ),
    //     Console.withTime(`Fetch package.json from ${extensionURLs.packageJson} to ${packageJsonOut}`)(
    //       pipe(
    //         fetchMaybeLocalDependency(extensionURLs.packageJson),
    //         Effect.flatMap(S.decodeUnknown(S.String)),
    //         Effect.flatMap(S.decodeUnknown(S.parseJson(BasicExtensionMeta))),
    //         Effect.tap(extInfo => Effect.logDebug(`Read extension data: ${JSON.stringify(extInfo)}`)),
    //         Effect.map(basicExtMeta => JSON.stringify({
    //           ...basicExtMeta,
    //           version: devModeExtensionDir
    //             ? `file:${devModeExtensionDir}`
    //             : basicExtMeta.version,
    //         })),
    //         Effect.tap(extInfo => Effect.logDebug(`Extension data to write: ${JSON.stringify(extInfo)}`)),
    //         Effect.flatMap(source =>
    //           fs.writeFileString(join(outdir, 'package.json'), source)),
    //       )
    //     ),
    //   ]),
    // );

    const dependency = yield * _(constructDependency(source, params));

    return yield * _(Effect.succeed(dependency));

    //yield * _(Effect.tryPromise(() =>
    //  esbuild({
    //    entryPoints: [extensionPathInOutdir],
    //    entryNames: '[dir]/[name]',
    //    assetNames: '[dir]/[name]',
    //    format: 'esm',
    //    target: ['esnext'],
    //    bundle: true,
    //  })
    //));
  });
};
