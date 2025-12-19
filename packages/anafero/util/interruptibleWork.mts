type ValidReturnValue = Exclude<any, null>;

type ReturnWrapper<T> = [
  /** Result after current iteration. */
  result: T | null,
  /** Whether to continue or break. */
  next: boolean,
];

type Func<T extends ValidReturnValue> =
  (step: number) => ReturnWrapper<T> | Promise<ReturnWrapper<T>>;


/**
 * Runs specified function until it instructs to stop or abort signal fires.
 * Every `chunkSize` iterations yields to allow event handlers to run.
 */
export default async function doInterruptibly<T extends ValidReturnValue>(
  func: Func<T>,
  cleanUp: Func<T>,
  chunkSize: number,
  signal: AbortController['signal'],
): Promise<T | null> {

  let aborted = false;

  signal.addEventListener('abort', function handleAbortInCacheDump() {
    aborted = true;
  });

  return new Promise((resolve, reject) => {
    let c = 0, result: T | null = null, stop: boolean = false;

    async function processNextChunk() {
      while (true) {
        if (aborted) {
          // TODO: use result?
          try {
            [result, ] = await cleanUp(c);
          } finally {
            reject("aborted");
          }
          break;
        } else if (stop) {
          resolve(result);
          break;
        }

        try {
          [result, stop] = await func(c);
        } catch (e) {
          // TODO: use result?
          try {
            [result, ] = await cleanUp(c);
          } finally {
            reject(e);
            break;
          }
        }

        c = c + 1;

        // Yield every chunkSize iterations
        // to allow event loop to handle events.
        if (c > 0 && (c % chunkSize) === 0) {
          setTimeout(processNextChunk);
          return;
        }
      }
    }

    processNextChunk();

  });
};
