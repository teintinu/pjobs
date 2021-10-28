
export type QueueState = {
  pending(): number
  total(): number
  done(): number
  percent(): number
  rate(): number | '-'
  timeRemaining(): string
}

export interface QueryPromisesOpts {
  concurrency?: number,
  onProgress?: (status: 'idle'|QueueState) => void
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
    total () {
      return total
    },
    pending () {
      return queue.length
    },
    done () {
      return total - queue.length
    },
    percent () {
      return (total - queue.length) / total
    },
    rate () {
      const now = Date.now()
      if (now > canRate) return '-'
      return (total - queue.length) / (now - start)
    },
    timeRemaining () {
      const now = Date.now()
      if (now > canRate) return '-'
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
          if (idle && queue.length === 0) resolve()
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
        onProgress(state)
      }, 1)
    }
    if (queue.length) {
      if (running < concurrency) {
        setTimeout(processNext, 1)
      }
    } else if (running < 1) {
      total = 0
      idle = true
    }
  }

  async function processNext () {
    if (queue.length < 1) return
    const fn = queue.shift()
    if (fn) {
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
