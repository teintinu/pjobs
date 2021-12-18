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
const promiseForTask2 = queue.promise(async () => { // add another job but returns a promise to this
  console.log('task 2')
  return 'OK'
})

await queue.waitFor() // wait for all jobs to be finished.
await promiseForTask2 // returns 'OK'
```

## `defer` 
allow you to deferred promise. Like [promise-deferred NPM](https://www.npmjs.com/package/promise-deferred) but lighter.

```typescript
import { defer } from 'pjobs'

const deffered = defer<number>()
setTimeout( ()=> deffered.resolve(1), 10) // 
setTimeout( ()=> deffered.reject(new Error('timeout')), 100)
await deffered.promise
```

## `sleep` 
allow you pause execution flow for some miliseconds

```typescript
import { sleep } from 'pjobs'
await sleep(100) // pauses execution flow for 100 miliseconds
```
## `asap` 
delay execution of a function to as soon as possible

```typescript
import { asap } from 'pjobs'
asap(()=>console.log('b')) // 'b' will be logged after 'a'
console.log('a');
```