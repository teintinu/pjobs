import { queuePromises } from './queue'
import { sleep } from './sleep'

describe('queuePromises', () => {
  it('usage sample', async () => {
    const queue = queuePromises({
      concurrency: 1,
      onProgress (status) {
        console.log('queue status: ', status)
      }
    })
    queue.enqueue(async () => {
      console.log('task 1')
    })
    queue.enqueue(async () => {
      console.log('task 2')
    })
    expect(queue.state()).not.toBe('idle')
    await queue.waitFor()
    expect(queue.state()).toBe('idle')
  })

  it('should wait close method be finish', async () => {
    const history: number[] = []

    let count = 0
    const queue = queuePromises({
      concurrency: 10,
      onProgress () {
      }
    })

    expect(queue.state()).toBe('idle')

    for (let i = 0; i < 30; i++) {
      const fn = (k:number) => {
        queue.enqueue(async () => {
          await sleep(k % 10 === 5 ? 30 : 1)
          history.push(k)
          count++
        })
      }
      fn(i)
    }

    const afterEnqueueState = queue.state()
    if (afterEnqueueState === 'idle') {
      expect(afterEnqueueState).not.toBe('idle')
    } else {
      expect(afterEnqueueState.done).toBe(0)
      expect(afterEnqueueState.pending).toBe(30)
      expect(afterEnqueueState.percent).toBe(0)
      expect(afterEnqueueState.rate).toBe('-')
      expect(afterEnqueueState.timeRemaining).toBe('-')
      expect(afterEnqueueState.total).toBe(30)
    }
    await queue.waitFor()
    expect(queue.state()).toBe('idle')

    for (let i = 30; i < 60; i++) {
      const fn = (k:number) => {
        queue.enqueue(async () => {
          await sleep(k % 10 === 5 ? 30 : 1)
          history.push(k)
          count++
        })
      }
      fn(i)
    }

    expect(queue.state()).not.toBe('idle')

    await queue.waitFor()
    expect(queue.state()).toBe('idle')

    expect(count).toBe(60)
    expect(queue.state()).toBe('idle')
    expect(history).toEqual([
      0, 1, 2, 3, 4, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 16, 17, 18, 19,
      20, 21, 22, 23, 24, 26, 27, 28, 29,
      5, 15, 25,
      30, 31, 32, 33, 34, 36, 37, 38, 39,
      40, 41, 42, 43, 44, 46, 47, 48, 49,
      50, 51, 52, 53, 54, 56, 57, 58, 59,
      35, 45, 55
    ]
    )
  })

  it('should report valid status', async () => {
    const log: string[] = []
    const queue = queuePromises({
      concurrency: 1,
      onProgress (status) {
        if (status === 'finished') {
          log.push('finished')
        } else {
          const expectedDone = log.length * 10
          const done = (status.done >= expectedDone - 2 && status.done <= expectedDone + 2)
            ? '~' + expectedDone
            : String(status.done)
          const expectedPending = 100 - log.length * 10
          const pending = (status.pending >= expectedPending - 2 && status.pending <= expectedPending + 2)
            ? '~' + expectedPending
            : String(status.pending)
          const expectedPercent = 100 - expectedPending
          const percent = (status.percent >= expectedPercent - 2 && status.percent <= expectedPercent + 2)
            ? '~' + expectedPercent
            : String(status.percent)
          const rate = (status.rate >= 9 && status.rate <= 11)
            ? '~10'
            : String(status.rate)
          log.push([
            `done: ${done}`,
            `pending: ${pending}`,
            `percent: ${percent}`,
            `rate: ${rate}`,
            `timeRemaining: ${status.timeRemaining}`,
            `total: ${status.total}`
          ].join())
        }
      }
    })
    for (let i = 0; i < 100; i++) {
      queue.enqueue(() => sleep(100))
    }
    expect(queue.state()).not.toBe('idle')
    await queue.waitFor()
    expect(queue.state()).toBe('idle')
    expect(log).toEqual([
      'done: ~0,pending: ~100,percent: ~0,rate: -,timeRemaining: -,total: 100',
      'done: ~10,pending: ~90,percent: ~10,rate: ~10,timeRemaining: 1 seconds,total: 100',
      'done: ~20,pending: ~80,percent: ~20,rate: ~10,timeRemaining: 2 seconds,total: 100',
      'done: ~30,pending: ~70,percent: ~30,rate: ~10,timeRemaining: 3 seconds,total: 100',
      'done: ~40,pending: ~60,percent: ~40,rate: ~10,timeRemaining: 4 seconds,total: 100',
      'done: ~50,pending: ~50,percent: ~50,rate: ~10,timeRemaining: 5 seconds,total: 100',
      'done: ~60,pending: ~40,percent: ~60,rate: ~10,timeRemaining: 6 seconds,total: 100',
      'done: ~70,pending: ~30,percent: ~70,rate: ~10,timeRemaining: 7 seconds,total: 100',
      'done: ~80,pending: ~20,percent: ~80,rate: ~10,timeRemaining: 8 seconds,total: 100',
      'done: ~90,pending: ~10,percent: ~90,rate: ~10,timeRemaining: 9 seconds,total: 100',
      'finished'
    ])
  })
})
