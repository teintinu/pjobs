
import { defer, asap, queuePromises } from '..'

describe('defer', () => {
  it('usage sample', async () => {
    const taskOne = defer<void>()
    const queue = queuePromises()
    queue.enqueue(async () => {
      console.log('task 1')
      taskOne.resolve()
    })
    queue.enqueue(async () => {
      console.log('task 2')
    })
    expect(queue.state()).not.toBe('idle')
    await taskOne.promise
    await queue.waitFor()
    expect(queue.state()).toBe('idle')
  })
  it('resolving', async () => {
    const p = defer<number>()
    asap(() => p.resolve(1))
    const v = await p.promise
    expect(v).toBe(1)
  })

  it('rejecting', async () => {
    const p = defer<number>()
    asap(() => p.reject(new Error('error')))
    try {
      const v = await p.promise
      expect(v).toBeUndefined()
    } catch (e: any) {
      expect(e.message).toBe('error')
    }
  })
})
