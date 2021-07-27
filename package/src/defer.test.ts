import { defer } from './defer'

describe('defer', () => {
  it('resolving', async () => {
    const p = defer<number>()
    setTimeout(() => p.resolve(1), 1)
    const v = await p.promise
    expect(v).toBe(1)
  })

  it('rejecting', async () => {
    const p = defer<number>()
    setTimeout(() => p.reject(new Error('error')))
    try {
      const v = await p.promise
      expect(v).toBeUndefined()
    } catch (e) {
      expect(e.message).toBe('error')
    }
  })
})
