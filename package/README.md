[![Node.js CI](https://github.com/teintinu/pjobs/actions/workflows/test.yml/badge.svg)](https://github.com/teintinu/pjobs/actions/workflows/test.yml)
[![Coverage Status](https://coveralls.io/repos/github/teintinu/pjobs/badge.svg?branch=main)](https://coveralls.io/github/teintinu/pjobs?branch=main)

# pjobs
A simple and efficient queue job executor using promises. And some promise's utilities.

# install

```bash
npm install --save pjobs
```

# usage

## `queuePromises` 
defines an executor for jobs. A job is just a function that returns a Promise. You can also control concurrency and promises.
```typescript
import { queuePromises } from 'pjobs'
const queue = queuePromises({ 
  concurrency: 1, // maximum of promises running concurrently
  onProgress (status) { // allow you to inform users about execution progress
    console.log('queue status: ', status)
  }
})
queue.enqueue(async () => { // add a job to the queue
  console.log('task 1')
})
queue.enqueue(async () => { // add another job to the queue
  console.log('task 2')
})

await queue.waitFor() // wait for all jobs to be finished.
```

## `defer` 
allow you to defer promise's resolving or rejecting.

```typescript
import { queuePromises, defer } from 'pjobs'
const taskOne = defer<void>() // defines the deferred promise
const queue = queuePromises()
queue.enqueue(async () => {
  console.log('task 1')
  taskOne.resolve() // resolves the deferred promise
})
queue.enqueue(async () => {
  console.log('task 2')
})
expect(queue.state()).not.toBe('idle')
await taskOne.promise // wait for the deferred promise to be resolved
await queue.waitFor()
```

## `sleep` 
allow you pause execution flow for some miliseconds

```typescript
import { sleep } from 'pjobs'
await sleep(100) // pause execution flow for 100 miliseconds
```
## `asap` 
delay execution of a function to as soon as possible

```typescript
import { asap } from 'pjobs'
asap(()=>console.log('b')) // 'b' will be logged after 'a'
console.log('a')
```