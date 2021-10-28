import { sleep } from './sleep'

it('sleep', async () => {
  const start = Date.now()
  await sleep(100)
  const end = Date.now()
  expect(end - start).toBeGreaterThan(90)
})
