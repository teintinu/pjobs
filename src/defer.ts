export interface Defer<T> {
  promise: Promise<T>;
  resolve(v: T): void;
  reject(reason: any): void;
}

export function defer<T>(): Defer<T> {
  let resolveFn: (v: T) => void;
  let rejectFn: (reason: any) => void;

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
    reject(reason: any) {
      if (rejectFn) {
        rejectFn(reason);
      }
    },
  };
}
