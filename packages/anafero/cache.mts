import doInterruptibly from './util/interruptibleWork.mjs';

/**
 *
 * This is geared towards relations, so each key stores an array
 * (of say edges/relation triples or resource URIs).
 *
 * Browser wrapper can supply something using IndexedDB or OPFS,
 * Node can supply something based on DuckDB.
 * DuckDB-WASM could cover both, but currently is in-memory only.
 */
export interface Cache {
  /** Set keys to given values. */
  set: (keyValueMap: Record<string, unknown>) => void;

  /** Append given values to key, preserving order. */
  add: <T>(key: string, values: readonly T[]) => void;

  /** Return all values at given key in order of addition. */
  list: <T>(key: string, page?: { start: number, size: number }) => readonly T[];

  /** Return value at given key. */
  get: <T>(key: string) => T;

  /** Emit values at given key in order of addition. */
  iterate: <T>(key: string) => Generator<T>;

  /** Returns true if given key exists. */
  has: (key: string) => boolean;

  /** Dumps as string. */
  dump: (
    stream: {
      write: (v: string, cb?: () => void) => void,
      on: (evtName: string, func: () => void) => void,
      end: (str?: string, cb?: () => void) => void,
    },
    signal: AbortController["signal"],
  ) => Promise<void>;
}

export function makeDummyInMemoryCache(): Cache {
  const cache: Record<string, unknown[]> = {};
  return {
    add: (key, values) => {
      cache[key] ??= [];
      cache[key].push(...values);
    },
    set: (map) => {
      Object.assign(cache, map);
    },
    iterate: function * iterateCache<T>(key: string) {
      yield * ((cache[key] ?? []) as T[]);
    },
    has: (key) => {
      return cache[key] !== undefined;
    },
    get: <T,>(key: string) => {
      if (cache[key] !== undefined) {
        return cache[key] as T;
      } else {
        console.error("Requested key does not exist:", key);
        //dump();
        throw new Error("Requested key does not exist");
      }
    },
    list: <T,>(key, page) => {
      if (cache[key] !== undefined) {
        if (!page) {
          return cache[key] as T[];
        } else {
          return cache[key].slice(page.start, page.start + page.size) as T[];
        }
      } else {
        console.error("Requested key does not exist:", key);
        //dump();
        throw new Error("Requested key does not exist");
      }
    },
    dump: async (stream, signal) => {

      return new Promise((resolve, reject) => {
        let aborted = false;

        signal.addEventListener('abort', function handleAbortInCacheDump() {
          aborted = true;
        });

        let keyPaths: (string | number)[][] = [];
        const seen: Set<any> = new Set();

        // Build a list of key paths, recursively
        // then iterate through the list, 

        async function buildKeypaths(
          obj: Record<string, unknown> | Array<unknown>,
          currentPath: (string | number)[],
        ) {
          if (aborted) {
            throw new Error("Aborted");
          }

          for (const key of Object.keys(Object(obj))) {
            const val = (obj as any)[key];
            if (typeof val === 'string' || Object.keys(Object(val)).length === 0) {
              keyPaths.push([...currentPath, key]);
            } else {
              const complexVal = val as Record<string, unknown> | Array<unknown>;
              if (!seen.has(complexVal)) {
                seen.add(complexVal);
                await buildKeypaths(complexVal, [...currentPath, key]);
              }
            }
          }
        }

        async function writeKeyValue(idx: number): Promise<[string, boolean]> {
          const keyPath = keyPaths[idx];
          if (keyPath) {
            const keyString = keyPath.join('.');
            keyPath.reverse();
            let valueCursor: any = cache;
            while (true) {
              let part = keyPath.pop();
              if (part) {
                valueCursor = valueCursor[part];
              } else {
                break;
              }
            }
            return new Promise((resolve, ) => {
              const s = `\n${JSON.stringify(keyString)}: ${valueCursor}`;
              stream.write(
                s,
                function () {
                  resolve([s, false]);
                },
              );
            });
          } else {
            // If there is no keypath at given index,
            // assume we finished
            return ['', true];
          }
        }

        function handleError(e: any) {
          return new Promise((_, reject) => {
            console.error("Failed to dump cache", e);
            stream.end(
              `\n-- error writing cache: ${e} --`,
              function () { reject(e) },
            );
          });
        }

        buildKeypaths(cache, []).
        then(() => new Promise((resolve, ) => {
          stream.write("\n-- start --", function () { resolve(void 0) });
        }), handleError).
        then(() => {
          return doInterruptibly(
            writeKeyValue,
            () => [null, true],
            1000,
            signal,
          );
        }, handleError).
        then(() => {
          stream.write("\n-- dump complete --", function () {
            stream.end("\n-- end --", function () { resolve(void 0) });
          });

        }, reject);
      });
    },
  } as const;
}
