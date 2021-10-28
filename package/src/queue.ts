import { asap } from './asap'

export type QueueState = {
  readonly pending: number
  readonly size: number
  readonly done: number
  readonly percent: number
  readonly rate: number | '-'
  readonly timeRemaining: string
}

export interface QueryPromisesOpts {
  concurrency?: number,
  onProgress?: (status: 'finished'|QueueState) => void
}

export type Job<T> = () => Promise<T>

export interface QueuePromises {
  readonly runned: number
  state (): 'idle'|QueueState,
  enqueue<T> (item: Job<T>):void,
  waitFor(): Promise<void>
}

export function queuePromises (opts?: QueryPromisesOpts): QueuePromises {
  const concurrency = opts?.concurrency || 1
  const onProgress = opts?.onProgress
  const queue: Array<Job<any>> = []
  let size = 0
  let idle = true
  let start = Date.now()
  let running = 0
  let canRate = 0
  let canRefresh = 0
  let lastError: any
  let runned = 0
  const state: QueueState = {
    get size () {
      return size
    },
    get pending () {
      return queue.length
    },
    get done () {
      return size - queue.length
    },
    get percent () {
      return Math.round((size - queue.length) / size * 1000) / 10
    },
    get rate () {
      const now = Date.now()
      if (now < canRate) return '-'
      const ellapsed = (now - start) / 1000
      const rate = (size - queue.length) / (ellapsed)
      return rate
    },
    get timeRemaining () {
      const now = Date.now()
      if (now < canRate) return '-'
      const ellapsed = (now - start) / 1000
      const rate = (size - queue.length) / (ellapsed)
      const seconds = (size - queue.length) / rate
      if (seconds < 50) return (seconds).toFixed(0) + ' seconds'
      if (seconds < 120) return 'one minute'
      const minutes = seconds / 60
      if (minutes < 60) return (minutes).toFixed(0) + ' minutes'
      const hours = minutes / 60
      if (hours < 120) return 'one hour'
      return (hours).toFixed(0) + ' hours'
    }
  }
  return {
    get runned () {
      return runned
    },
    state () {
      return idle ? 'idle' : state
    },
    enqueue<T> (item: Job<T>) {
      queue.push(item)
      size++
      canRate = Date.now() + 1000
      scheduleProcess()
    },
    waitFor () {
      return new Promise<void>((resolve, reject) => {
        setTimeout(check, 100)
        function check () {
          if (running + queue.length === 0) {
            if (lastError) reject(lastError)
            else resolve()
            lastError = undefined
          } else setTimeout(check, 100)
        }
      })
    }
  }

  function scheduleProcess () {
    if (idle) {
      start = Date.now()
      idle = false
    }
    const now = Date.now()
    if (now > canRefresh) {
      canRefresh = now + 1000
      onProgress && setTimeout(() => {
        if (size > 0) {
          onProgress(state)
        }
      }, 1)
    }
    if (queue.length) {
      asap(processNext)
    } else if (running < 1) {
      size = 0
      onProgress && asap(() => onProgress('finished'))
      idle = true
      setTimeout(() => {
        lastError = undefined
      }, 2000)
    }
  }

  async function processNext () {
    while (running < concurrency) {
      const fn = queue.shift()
      if (!fn) break
      running++
      try {
        await fn()
      } catch (e:any) {
        lastError = e
      } finally {
        runned++
        running--
        scheduleProcess()
      }
    }
  }
}
