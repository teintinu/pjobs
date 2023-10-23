export interface Defer<T> {
  promise: Promise<T>;
  resolve(v: T): void;
  reject(reason: unknown): void;
}

export function defer<T>(): Defer<T> {
  let resolveFn: (v: T) => void;
  let rejectFn: (reason: unknown) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  return {
    promise,
    resolve(v: T) {
      if (resolveFn) {
        resolveFn(v);
      }
    },
    reject(reason) {
      if (rejectFn) {
        rejectFn(reason);
      }
    },
  };
}
