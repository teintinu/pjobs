import { asap } from './asap'

export type QueueState = {
  readonly pending: number
  readonly total: number
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

export function queuePromises (opts?: QueryPromisesOpts) {
  const concurrency = opts?.concurrency || 1
  const onProgress = opts?.onProgress
  const queue: Array<Job<any>> = []
  let total = 0
  let idle = true
  let start = Date.now()
  let running = 0
  let canRate = 0
  let canRefresh = 0
  const state: QueueState = {
    get total () {
      return total
    },
    get pending () {
      return queue.length
    },
    get done () {
      return total - queue.length
    },
    get percent () {
      return Math.round((total - queue.length) / total * 1000) / 10
    },
    get rate () {
      const now = Date.now()
      if (now < canRate) return '-'
      const ellapsed = (now - start) / 1000
      const rate = (total - queue.length) / (ellapsed)
      return rate
    },
    get timeRemaining () {
      const now = Date.now()
      if (now < canRate) return '-'
      const ellapsed = (now - start) / 1000
      const rate = (total - queue.length) / (ellapsed)
      const seconds = (total - queue.length) / rate
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
    state () {
      return idle ? 'idle' : state
    },
    enqueue<T> (item: Job<T>) {
      queue.push(item)
      total++
      canRate = Date.now() + 1000
      scheduleProcess()
    },
    waitFor () {
      return new Promise<void>((resolve) => {
        setTimeout(check, 100)
        function check () {
          if (running + queue.length === 0) resolve()
          else setTimeout(check, 100)
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
        if (total > 0) {
          onProgress(state)
        }
      }, 1)
    }
    if (queue.length) {
      asap(processNext)
    } else if (running < 1) {
      total = 0
      onProgress && asap(() => onProgress('finished'))
      idle = true
    }
  }

  async function processNext () {
    while (running < concurrency) {
      const fn = queue.shift()
      if (!fn) break
      running++
      try {
        await fn()
      } finally {
        running--
        scheduleProcess()
      }
    }
  }
}
