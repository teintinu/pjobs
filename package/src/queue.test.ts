import { queuePromises } from './queue'
import { sleep } from './sleep'

describe('queuePromises', () => {
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

    expect(queue.state()).not.toBe('idle')

    await sleep(50)
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

    await sleep(50)
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
})
