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
  /** Set key to given value. */
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

  dump: () => any;
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
    iterate: function * iterateCache (key) {
      yield * (cache[key] ?? []);
    },
    has: (key) => {
      return cache[key] !== undefined;
    },
    get: (key, page) => {
      if (cache[key] !== undefined) {
        return cache[key];
      } else {
        console.error("Requested key does not exist:", key);
        //dump();
        throw new Error("Requested key does not exist");
      }
    },
    list: (key, page) => {
      if (cache[key] !== undefined) {
        if (!page) {
          return cache[key];
        } else {
          return cache[key].slice(page.start, page.start + page.size);
        }
      } else {
        console.error("Requested key does not exist:", key);
        //dump();
        throw new Error("Requested key does not exist");
      }
    },
    dump: () => cache,
  } as const;
}