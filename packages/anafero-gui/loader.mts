import { useState, useEffect, useCallback } from 'react';
import { useThrottledCallback } from 'use-debounce';


export function useJSONFetcher() {
  return useCallback(function fetchJSON<T extends string>(
    paths: T[],
    onProgress: (done: number, total: number) => void,
    onDone: (result: Record<T, any>) => void,
  ): () => void {
    return makeLoader<T>(
      paths.
        map(dep => ({ [dep]: { responseType: 'json' } as const })).
        reduce((prev, curr) =>
          ({ ...prev, ...curr }),
          {},
        ) as Record<T, { responseType: 'json' }>,
      (done, total) => onProgress(
        done.reduce((a, b) => a + b),
        total.reduce((a, b) => a + b),
      ),
      (src, msg, resp) => console.error("Error fetching", src, msg, resp),
      (src, resp) => {
        //console.debug("Fetched", src);
      },
      onDone,
    ).load();
  }, []);
};


export function useAssetLoader<T extends string>(
  paths: T[],
): {
  loadProgress: LoadProgress;
  assetData: undefined | Record<T, any>;
} {
  type AssetData = Record<T, any>;

  const fetchJSON = useJSONFetcher();

  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ done: 0, total: 0 });
  const setLoadProgressThrottled = useThrottledCallback(setLoadProgress, 200);
  const [assetData, setAssetData] = useState<undefined | AssetData>(undefined);

  useEffect(() => {
    const depURLs = paths;
    return fetchJSON(
      depURLs,
      (done, total) => setLoadProgressThrottled({
        done,
        total,
      }),
      (results) => {
        setLoadProgressThrottled({
          done: 100,
          total: 100,
        })
        setAssetData(Object.entries(results).
          filter(([src]) => depURLs.includes(src as any)).
          map(([src, resp]) => ({ [src]: resp })).
          reduce((prev, curr) =>
            ({ ...prev, ...curr }),
            {},
          ) as AssetData);
        },
    );
  }, [fetchJSON, paths]);

  return {
    assetData,
    loadProgress,
  };
};



export interface LoadProgress {
  /** Bytes done. */
  done: number;
  /** Bytes total. */
  total: number;
}
interface RequestOptions {
  responseType: 'json' | 'arraybuffer';
}
export function makeLoader<Src extends string>(
  srcs: { [src in Src]: RequestOptions },
  onProgress: (done: number[], total: number[]) => void,
  onError: (assetSrc: Src, msg?: string, resp?: XMLHttpRequest["response"]) => void,
  onDone: (assetSrc: Src, data: any) => void,
  onDoneAll: (results: { [src in Src]: any }) => void,
) {

  const LOAD_STATUS = Object.keys(srcs).
  map(src => ({ [src]: { done: 0, total: 0 } })).
  reduce((prev, curr) =>
    ({ ...prev, ...curr }), {} as Record<Src, LoadProgress>
  );

  return {
    load,
  };

  function load() {

    function abortAll() {
      console.debug("loader: cancelling");
      for (const xhr of getXHRs()) {
        xhr.abort();
      }
    }

    const xhrs: { [src in Src]: XMLHttpRequest } = Object.entries(srcs).
      map(f => {
        const [assetSrc, reqOpts] = f as [Src, RequestOptions];
        console.debug("loader: got asset", assetSrc);

        const xhr = new XMLHttpRequest;
        xhr.responseType = reqOpts.responseType;

        xhr.open('GET', assetSrc, true);
        xhr.onload = function (e) {
          if (!LOAD_STATUS[assetSrc]!.total && xhr.readyState > 1) {
            const rawTotal = xhr.getResponseHeader('content-length');
            if (rawTotal) {
              const total = parseInt(rawTotal || '0', 10);
              if (total) {
                LOAD_STATUS[assetSrc]!.total = total;
              }
            }
          }
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              handleDone();
            } else {
              handleError((e.currentTarget as XMLHttpRequest).status);
            }
          }
        };
        xhr.onerror = function (e) {
          handleError((e.currentTarget as XMLHttpRequest).status);
        };
        xhr.onprogress = function (e) {
          if (!LOAD_STATUS[assetSrc]) {
            throw new Error(`XHR reported progress on unknown asset ${assetSrc} (not being loaded)`);
          }
          LOAD_STATUS[assetSrc].done = e.loaded;
          if (e.total) {
            LOAD_STATUS[assetSrc].total = e.total;
          }
          onProgress(
            Object.values(LOAD_STATUS).map(e => e['done']),
            Object.values(LOAD_STATUS).map(e => e['total']),
          );
        };

        xhr.send();

        function handleError(status: number, e?: unknown) {
          console.error("failed to load dependency", assetSrc, status, xhr.response, e);
          if (status === 404) {
            onError(assetSrc, "Asset was not found");
          } else if (status === 500) {
            onError(assetSrc, "Server error occurred while fetching the asset");
          } else if (status === 0) {
            onError(assetSrc, "Request was aborted or content length is specified incorrectly");
          } else {
            onError(assetSrc, "Web server’s response was unexpected", xhr.response);
          }

          abortAll();
        }

        return { [assetSrc]: xhr };
      }).
      reduce((prev, curr) => ({ ...prev, ...curr }), {}) as { [key in Src]: XMLHttpRequest };

    function getXHRs(): XMLHttpRequest[] {
      return ([...Object.values(xhrs)] as XMLHttpRequest[]);
    }

    function handleDone() {
      const unfinished = getXHRs().find(xhr => xhr.status !== 200 || xhr.readyState !== 4);

      if (!unfinished) {
        const allResults = {} as { [src in Src]: any };
        for (const [src, resp] of Object.entries(xhrs)) {
          allResults[src as Src] = (resp as XMLHttpRequest)?.response;
          onDone(src as Src, (resp as XMLHttpRequest)?.response);
        }
        onDoneAll(allResults);
      }
    }

    return abortAll;
  }
}

//const byteFormatter = Intl.NumberFormat(navigator.language, {
//  notation: "compact",
//  style: "unit",
//  unit: "byte",
//  unitDisplay: "narrow",
//});

//const app = document.getElementById('app')!;
//app.innerHTML = '';
//
//function createProgress(assetSrc: string): { bar: HTMLElement, label: HTMLElement } {
//  if (!assets[assetSrc]) {
//    const progressEl = document.createElement('progress');
//    progressEl.style.marginBottom = '1em';
//    const statusEl = document.createElement('p');
//    app.appendChild(progressEl);
//    app.appendChild(statusEl);
//    assets[assetSrc] = { bar: progressEl, label: statusEl };
//  }
//  return assets[assetSrc];
//}
//const assets:
//Record<string, { bar: HTMLElement, label: HTMLElement }> =
//{} as const;
//
//const assetSrcs = ['./index.js', './index.css'] as const;
//loadAsset<typeof assetSrcs[number]>(
//  assetSrcs,
//  function handleProgress (done_, total_) {
//    for (const [idx, ] of total_.entries()) {
//      const assetSrc = assetSrcs[idx];
//      const { bar: progressEl, label: statusEl } = createProgress(assetSrc);
//      const done = done_[idx];
//      const total = total_[idx];
//      if (done < total) {
//        progressEl.setAttribute('max', String(total));
//        progressEl.setAttribute('value', String(done));
//      } else {
//        progressEl.removeAttribute('max');
//        progressEl.removeAttribute('value');
//      }
//      statusEl.innerHTML = `Loading ${assetSrc}<br/>${byteFormatter.format(done)}`;
//    }
//  },
//  function handleError (assetSrc, err) {
//    const { label: statusEl } = createProgress(assetSrc);
//    statusEl.innerHTML = `An error occurred fetching ${assetSrc}.<br />${err}.`;
//  },
//  function handleDone (src) {
//    if (src.endsWith('.js')) {
//      const tag = document.createElement('script');
//      tag.setAttribute('src', src);
//      document.head.appendChild(tag);
//    } else if (src.endsWith('.css')) {
//      const tag = document.createElement('link');
//      tag.setAttribute('href', src);
//      tag.setAttribute('rel', 'stylesheet');
//      document.head.appendChild(tag);
//    }
//  },
//);
