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
      async function * buildKeypaths(
        obj: Record<string, unknown> | Array<unknown>,
        currentPath: (string | number)[],
        seen: Set<any>,
        paths: (string | number)[][],
        signal: AbortController['signal'],
      ): AsyncGenerator<(string | number)[]> {
        if (signal.aborted) {
          throw new Error("Aborted");
        }

        for (const key of Object.keys(Object(obj))) {
          const val = (obj as any)[key];
          if (typeof val === 'string' || Object.keys(Object(val)).length === 0) {
            yield [...currentPath, key];
          } else {
            const complexVal = val as Record<string, unknown> | Array<unknown>;
            if (!seen.has(complexVal)) {
              seen.add(complexVal);
              yield * buildKeypaths(
                complexVal,
                [...currentPath, key],
                seen,
                paths,
                signal,
              );
            }
          }
        }
      }

      async function write(
        data: string,
        end?: true,
      ): Promise<void> {
        return new Promise((resolve, ) => {
          if (end) {
            stream.end(data, function () { resolve(); });
          } else {
            stream.write(data, function () { resolve(); });
          }
        });
      }

      function serializeKeypath(
        idx: number,
        keyPaths: (string | number)[][],
      ): string | null {
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
          return `\n${JSON.stringify(keyString)}: ${valueCursor}`;
        } else {
          // If there is no keypath at given index,
          // assume we finished
          return null;
        }
      }

      const pathGen = buildKeypaths(cache, [], new Set(), [], signal);
      const paths = [];
      for await (const p of pathGen) {
        paths.push(p);
      }

      await write(`\n-- starting dumping ${paths.length} paths --`);

      let idx = 0;
      const chunkSize = 1000;
      let chunk = '';
      while (true) {
        if (idx > 0 && idx % chunkSize === 0) {
          await write(chunk);
          chunk = '';
        }
        const nextItem = serializeKeypath(idx, paths);
        if (nextItem) {
          chunk = chunk + nextItem;
        } else {
          break;
        }
        idx += 1;
      }

      return;
    },
  } as const;
}
