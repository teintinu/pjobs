import { asap } from "./asap";
import { defer } from "./defer";

export type QueueState = {
  readonly pending: number;
  readonly size: number;
  readonly running: number;
  readonly done: number;
  readonly percent: number;
  readonly rate: number | "-";
  readonly timeRemaining: string;
};

export interface QueryPromisesOpts {
  concurrency?: number;
  onProgress?: (status: "idle" | QueueState) => void;
}

export type Job<T> = () => Promise<T>;

export interface QueuePromises {
  state(): "idle" | QueueState;
  enqueue<T>(item: Job<T>): void;
  enqueue<T>(items: Array<Job<T>>): void;
  promise<T>(item: Job<T>): Promise<T>;
  promise<T>(items: Array<Job<T>>): Promise<T[]>;
  forEach<T>(
    items: T[],
    fn: (item: T, currentIndex: number, array: T[]) => Promise<void>
  ): Promise<void>;
  map<T>(
    items: T[],
    fn: (item: T, currentIndex: number, array: T[]) => Promise<T>
  ): Promise<T[]>;
  reduce<U, T>(
    items: T[],
    fn: (
      previousValue: U,
      currentValue: T,
      currentIndex: number,
      array: T[]
    ) => Promise<U>,
    initialValue: U
  ): Promise<U>;
  some<T>(
    items: T[],
    fn: (item: T, currentIndex: number, array: T[]) => Promise<boolean>
  ): Promise<T | undefined>;
  waitFor(): Promise<void>;
  setConcurrency(concurrency: number): void;
  forceState(opts: {
    start: number;
    canRate: number;
    canRefresh: number;
    size: number;
    done: number;
  }): void;
}

export function queuePromises(opts?: QueryPromisesOpts): QueuePromises {
  let concurrency = Math.max(1, opts?.concurrency || 1);
  const onProgress = opts?.onProgress;
  const queue: Array<Job<unknown>> = [];
  let size = 0;
  let idle = true;
  let measure: [number, number][] = [];
  let running = 0;
  let canRate = 0;
  let tmProgress: NodeJS.Timeout;
  let canProgress = 0;
  let lastError: any;
  let done = 0;
  return {
    state() {
      return idle ? "idle" : getState();
    },
    enqueue<T>(item: Job<T> | Array<Job<T>>) {
      if (Array.isArray(item)) {
        queue.push(...item);
        size += item.length;
      } else {
        queue.push(item);
        size++;
      }
      canRate = Date.now() + 1000;
      process();
    },
    promise<T>(item: Job<T> | Array<Job<T>>) {
      if (Array.isArray(item)) {
        return Promise.all(item.map((job) => this.promise(job)));
      }
      const deferred = defer<T>();
      this.enqueue(() => item().then(deferred.resolve, deferred.reject));
      return deferred.promise;
    },
    forEach<T>(
      items: T[],
      fn: (item: T, idx: number, arr: T[]) => Promise<void>
    ): Promise<void> {
      return Promise.all(
        items.map((item, idx, arr) => {
          return this.promise(() => fn(item, idx, arr));
        })
      ).then(() => undefined);
    },
    map<T>(
      items: T[],
      fn: (item: T, idx: number, arr: T[]) => Promise<T>
    ): Promise<T[]> {
      return Promise.all(
        items.map((item, idx, arr) => {
          return this.promise(() => fn(item, idx, arr));
        })
      );
    },
    reduce<U, T>(
      items: T[],
      fn: (
        previousValue: U,
        currentValue: T,
        currentIndex: number,
        array: T[]
      ) => Promise<U>,
      initialValue: U
    ): Promise<U> {
      let value = initialValue;
      return Promise.all(
        items.map((item, idx, arr) =>
          this.promise(() =>
            fn(value, item, idx, arr).then((val) => {
              value = val;
            })
          )
        )
      ).then(() => value);
    },
    some<T>(
      items: T[],
      fn: (item: T, idx: number, arr: T[]) => Promise<boolean>
    ): Promise<T | undefined> {
      let found = false;
      return new Promise<T | undefined>((resolve, reject) => {
        void Promise.all(
          items.map((item, idx, arr) =>
            this.promise(() => {
              if (found) return Promise.resolve();
              return fn(item, idx, arr).then((val) => {
                if (val) {
                  found = true;
                  resolve(item);
                }
              }, reject);
            })
          )
        ).then(() => {
          if (!found) resolve(undefined);
        });
      });
    },
    waitFor() {
      return new Promise<void>((resolve, reject) => {
        setTimeout(check, 100);
        function check() {
          if (idle) {
            if (lastError) reject(lastError);
            else resolve();
            lastError = undefined;
          } else setTimeout(check, 100);
        }
      });
    },
    setConcurrency(newconcurrency: number): void {
      concurrency = Math.max(newconcurrency, 1);
      process();
    },
    forceState(forcedOpts: {
      start: number;
      canRate: number;
      canRefresh: number;
      size: number;
      done: number;
    }) {
      measure = [[forcedOpts.start, 0]];
      canRate = forcedOpts.canRate;
      size = forcedOpts.size;
      done = forcedOpts.done;
    },
  };

  function process() {
    if (idle) {
      measure = [[Date.now(), 0]];
      idle = false;
    }
    if (queue.length) {
      startJobs();
    } else if (running < 1) {
      size = 0;
      done = 0;
      idle = true;
      updateUI();
      setTimeout(() => {
        lastError = undefined;
      }, 2000);
    } else updateUI();
  }

  function updateUI() {
    if (idle || Date.now() > canProgress) asap(doProgress);
    else {
      if (tmProgress) clearTimeout(tmProgress);
      tmProgress = setTimeout(updateUI, 1000);
    }
    function doProgress() {
      if (Date.now() < canProgress) return;
      if (onProgress) {
        canProgress = Date.now() + 1000;
        if (size > 0) {
          onProgress(getState());
        } else onProgress("idle");
      }
    }
  }

  function startJobs() {
    while (running < concurrency) {
      const fn = queue.shift();
      if (!fn) break;
      running++;
      updateUI();
      fn()
        .catch((err) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          lastError = err;
        })
        .finally(() => {
          done++;
          running--;
          updateUI();
          process();
        });
    }
  }

  function getState(): QueueState {
    return {
      get size() {
        return size;
      },
      get running() {
        return running;
      },
      get pending() {
        return queue.length;
      },
      get done() {
        return done;
      },
      get percent() {
        return Math.round((done / size) * 1000) / 10;
      },
      get rate() {
        return computeRate() || "-";
      },
      get timeRemaining() {
        return computeTimeRemaining();
      },
    };
    function computeRate() {
      const now = Date.now();
      if (now < canRate) return false;
      const newDone = done + running;
      const oldDone = measure[0][1];
      const sizediff = newDone - oldDone;
      if (sizediff <= 0) return false;
      measure.push([now, newDone]);
      while (measure.length > 30) measure = measure.slice(measure.length - 30);
      const last = measure[0][0];
      const timediff = (now - last) / 1000;
      const rate = sizediff / timediff;
      return rate;
    }
    function computeTimeRemaining() {
      const rate = computeRate();
      if (rate === false) return "-";
      const seconds = (running + queue.length) / rate;
      if (seconds < 2) return "one second";
      if (seconds < 50) return `${seconds.toFixed(0)} seconds`;
      if (seconds < 120) return "one minute";
      const minutes = seconds / 60;
      if (minutes < 60) return `${minutes.toFixed(0)} minutes`;
      const hours = minutes / 60;
      if (minutes < 120) return "one hour";
      return `${hours.toFixed(0)} hours`;
    }
  }
}
