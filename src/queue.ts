
import { asap } from './asap'
import { defer } from './defer'

export type QueueState = {
  readonly pending: number;
  readonly size: number;
  readonly running: number;
  readonly done: number;
  readonly percent: number;
  readonly rate: number | '-';
  readonly timeRemaining: string;
};

export interface QueryPromisesOpts {
  concurrency?: number;
  onProgress?: (status: 'idle' | QueueState) => void;
}

export type Job<T> = () => Promise<T>;

export interface QueuePromises {
  state(): 'idle' | QueueState;
  enqueue<T>(item: Job<T>): void;
  enqueue<T>(items: Array<Job<T>>): void;
  promise<T>(item: Job<T>): Promise<T>;
  promise<T>(items: Array<Job<T>>): Promise<T[]>;
  waitFor(): Promise<void>;
  setConcurrency(concurrency: number): void;
  forceState(opts: {
    start: number;
    canRate: number;
    canRefresh: number;
    size: number;
    runned: number;
  }): void;
}

export function queuePromises (opts?: QueryPromisesOpts): QueuePromises {
  let concurrency = Math.max(1, opts?.concurrency || 1)
  const onProgress = opts?.onProgress
  const queue: Array<Job<any>> = []
  let size = 0
  let idle = true
  let measure: [number, number][] = []
  let running = 0
  let canRate = 0
  let tmProgress: any
  let canProgress = 0
  let lastError: any
  let runned = 0
  return {
    state () {
      return idle ? 'idle' : getState()
    },
    enqueue<T> (item: Job<T> | Array<Job<T>>) {
      if (Array.isArray(item)) {
        queue.push(...item)
        size += item.length
      } else {
        queue.push(item)
        size++
      }
      canRate = Date.now() + 1000
      process()
    },
    promise<T> (item: Job<T> | Array<Job<T>>) {
      if (Array.isArray(item)) {
        return Promise.all(item.map(job => this.promise(job)))
      } else {
        const deferred = defer<T>()
        this.enqueue(() => item().then(deferred.resolve, deferred.reject))
        return deferred.promise
      }
    },
    waitFor () {
      return new Promise<void>((resolve, reject) => {
        setTimeout(check, 100)
        function check () {
          if (idle) {
            if (lastError) reject(lastError)
            else resolve()
            lastError = undefined
          } else setTimeout(check, 100)
        }
      })
    },
    setConcurrency (newconcurrency: number): void {
      concurrency = Math.max(newconcurrency, 1)
      process()
    },
    forceState (opts: {
      start: number;
      canRate: number;
      canRefresh: number;
      size: number;
      runned: number;
    }) {
      measure = [[opts.start, 0]]
      canRate = opts.canRate
      size = opts.size
      runned = opts.runned
    }
  }

  function process () {
    if (idle) {
      measure = [[Date.now(), 0]]
      idle = false
    }
    if (queue.length) {
      startJobs()
    } else if (running < 1) {
      size = 0
      runned = 0
      idle = true
      updateUI()
      setTimeout(() => {
        lastError = undefined
      }, 2000)
    } else updateUI()
  }

  function updateUI () {
    if (idle || Date.now() > canProgress) asap(doProgress)
    else {
      if (tmProgress) clearTimeout(tmProgress)
      tmProgress = setTimeout(updateUI, 1000)
    }
    function doProgress () {
      if (Date.now() < canProgress) return
      if (onProgress) {
        canProgress = Date.now() + 1000
        if (size > 0) {
          onProgress(getState())
        } else onProgress('idle')
      }
    }
  }

  function startJobs () {
    while (running < concurrency) {
      const fn = queue.shift()
      if (!fn) break
      running++
      updateUI()
      fn()
        .catch((err) => {
          lastError = err
        })
        .finally(async () => {
          runned++
          running--
          updateUI()
          process()
        })
    }
  }

  function getState (): QueueState {
    return {
      get size () {
        return size
      },
      get running () {
        return running
      },
      get pending () {
        return queue.length
      },
      get done () {
        return runned
      },
      get percent () {
        return Math.round((runned / size) * 1000) / 10
      },
      get rate () {
        return computeRate() || '-'
      },
      get timeRemaining () {
        return computeTimeRemaining()
      }
    }
    function computeRate () {
      const now = Date.now()
      if (now < canRate) return false
      const newDone = runned + running
      const oldDone = measure[0][1]
      const sizediff = newDone - oldDone
      if (sizediff <= 0) return false
      measure.push([now, newDone])
      while (measure.length > 30) measure = measure.slice(measure.length - 30)
      const last = measure[0][0]
      const timediff = (now - last) / 1000
      const rate = sizediff / timediff
      return rate
    }
    function computeTimeRemaining () {
      const rate = computeRate()
      if (rate === false) return '-'
      const seconds = (running + queue.length) / rate
      if (seconds < 2) return 'one second'
      if (seconds < 50) return seconds.toFixed(0) + ' seconds'
      if (seconds < 120) return 'one minute'
      const minutes = seconds / 60
      if (minutes < 60) return minutes.toFixed(0) + ' minutes'
      const hours = minutes / 60
      if (minutes < 120) return 'one hour'
      return hours.toFixed(0) + ' hours'
    }
  }
}
