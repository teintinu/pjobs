/* eslint-disable no-console */
/* eslint-disable no-nested-ternary */
/* eslint-disable no-shadow */
import { queuePromises, sleep } from ".";

describe("queuePromises", () => {
  it("usage sample", async () => {
    const queue = queuePromises({
      onProgress(status) {
        console.log("queue status: ", status);
      },
    });
    queue.enqueue(async () => {
      console.log("task 1");
      return Promise.resolve();
    });
    const resultOfTask2 = queue.promise(async () => {
      console.log("task 2");
      return Promise.resolve("OK");
    });
    expect(queue.state()).not.toBe("idle");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
    expect(await resultOfTask2).toBe("OK");
  });

  it("should wait close method be finish", async () => {
    const history: number[] = [];

    let count = 0;
    const queue = queuePromises({ concurrency: 10 });

    expect(queue.state()).toBe("idle");

    const fn = (k: number) => {
      queue.enqueue(async () => {
        await sleep(k % 10 === 5 ? 50 : 1);
        history.push(k);
        count++;
      });
    };
    for (let i = 0; i < 30; i++) {
      fn(i);
    }

    const afterEnqueueState = queue.state();
    if (typeof afterEnqueueState === "string") {
      expect(afterEnqueueState).not.toBe("idle or finished");
    } else {
      expect(afterEnqueueState.done).toBe(0);
      expect(afterEnqueueState.pending).toBe(20);
      expect(afterEnqueueState.percent).toBe(0);
      expect(afterEnqueueState.rate).toBe("-");
      expect(afterEnqueueState.timeRemaining).toBe("-");
      expect(afterEnqueueState.size).toBe(30);
    }
    await queue.waitFor();
    expect(queue.state()).toBe("idle");

    for (let i = 30; i < 60; i++) {
      const fn = (k: number) => {
        queue.enqueue(async () => {
          await sleep(k % 10 === 5 ? 30 : 1);
          history.push(k);
          count++;
        });
      };
      fn(i);
    }

    expect(queue.state()).not.toBe("idle");

    await queue.waitFor();
    expect(queue.state()).toBe("idle");

    expect(count).toBe(60);
    expect(queue.state()).toBe("idle");
    expect(history).toEqual([
      0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22,
      23, 24, 26, 27, 28, 29, 5, 15, 25, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 56, 57, 58, 59, 35,
      45, 55,
    ]);
  });

  it("should report valid status", async () => {
    const log: string[] = [];
    let lastloged = -1;
    const { now } = Date;
    let mockedDate = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => {
      return mockedDate;
    });
    const queue = queuePromises({
      concurrency: 1,
      onProgress(status) {
        if (typeof status !== "string") {
          if (lastloged === status.done) return;
          lastloged = status.done;
          const expectedDone = log.length * 10;
          const done =
            status.done >= expectedDone - 10 && status.done <= expectedDone + 10
              ? `~${expectedDone}`
              : String(status.done);
          const expectedPending = 100 - log.length * 10;
          const { running } = status;
          const pending =
            status.pending >= expectedPending - 10 &&
            status.pending <= expectedPending + 10
              ? `~${expectedPending}`
              : String(status.pending);
          const expectedPercent = 100 - expectedPending;
          const percent =
            status.percent >= expectedPercent - 10 &&
            status.percent <= expectedPercent + 10
              ? `~${expectedPercent}`
              : String(status.percent);
          let tr = status.timeRemaining.replace(" seconds", "");
          if (tr === "one second") tr = "1";
          const trv = tr === "-" ? 0 : parseInt(tr, 10);
          const expectedTimeRemaining = Math.round(expectedPending / 10);
          const timeRemaining =
            tr === "-"
              ? "-"
              : trv >= expectedTimeRemaining - 4 &&
                trv <= expectedTimeRemaining + 4
              ? `~${expectedTimeRemaining}`
              : `${tr}!=${expectedTimeRemaining}`;

          const rate =
            typeof status.rate === "number" &&
            status.rate >= 9 &&
            status.rate <= 11
              ? "~10"
              : String(status.rate);
          log.push(
            [
              `done: ${done}`,
              `pending: ${pending}`,
              `running: ${running}`,
              `percent: ${percent}`,
              `rate: ${rate}`,
              `timeRemaining: ${timeRemaining}`,
              `size: ${status.size}`,
            ].join(),
          );
        }
      },
    });
    const start = now.call(Date);
    for (let i = 0; i < 100; i++) {
      const idx = i;
      queue.enqueue(async () => {
        let tm = 100 + idx * 100 - (now.call(Date) - start);
        if (tm < 1) tm = 1;
        await sleep(tm);
        mockedDate += 100;
      });
    }
    expect(queue.state()).not.toBe("idle");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
    expect(log).toEqual([
      "done: ~0,pending: ~100,running: 1,percent: ~0,rate: -,timeRemaining: -,size: 100",
      "done: ~10,pending: ~90,running: 1,percent: ~10,rate: ~10,timeRemaining: ~9,size: 100",
      "done: ~20,pending: ~80,running: 1,percent: ~20,rate: ~10,timeRemaining: ~8,size: 100",
      "done: ~30,pending: ~70,running: 1,percent: ~30,rate: ~10,timeRemaining: ~7,size: 100",
      "done: ~40,pending: ~60,running: 1,percent: ~40,rate: ~10,timeRemaining: ~6,size: 100",
      "done: ~50,pending: ~50,running: 1,percent: ~50,rate: ~10,timeRemaining: ~5,size: 100",
      "done: ~60,pending: ~40,running: 1,percent: ~60,rate: ~10,timeRemaining: ~4,size: 100",
      "done: ~70,pending: ~30,running: 1,percent: ~70,rate: ~10,timeRemaining: ~3,size: 100",
      "done: ~80,pending: ~20,running: 1,percent: ~80,rate: ~10,timeRemaining: ~2,size: 100",
      "done: ~90,pending: ~10,running: 1,percent: ~90,rate: ~10,timeRemaining: ~1,size: 100",
    ]);
  });

  it("should support forced status", async () => {
    const queue = queuePromises({
      concurrency: 10,
    });
    for (let i = 1; i <= 20; i++) {
      queue.enqueue(
        i <= 10 ? async () => sleep(1000) : async () => Promise.resolve(),
      );
    }

    let state = queue.state();
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(20);
      expect(state.done).toEqual(0);
      expect(state.running).toEqual(10);
      expect(state.rate).toEqual("-");
      expect(state.timeRemaining).toEqual("-");
    }

    state = queue.state();
    queue.forceState({
      start: Date.now() - 1000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(29.9);
      expect(state.timeRemaining).toEqual("one second");
    }

    state = queue.state();
    queue.forceState({
      start: Date.now() - 10000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(2.9);
      expect(state.timeRemaining).toMatch(/\d+ seconds/);
    }

    queue.forceState({
      start: Date.now() - 100000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(0.29);
      expect(state.timeRemaining).toEqual("one minute");
    }

    queue.forceState({
      start: Date.now() - 600000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(0.049);
      expect(state.timeRemaining).toMatch(/\d+ minutes/);
    }

    queue.forceState({
      start: Date.now() - 6000000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(0.0049);
      expect(state.timeRemaining).toEqual("one hour");
    }

    queue.forceState({
      start: Date.now() - 12000000,
      canRate: Date.now(),
      canRefresh: Date.now(),
      size: 40,
      done: 20,
    });
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.size).toEqual(40);
      expect(state.done).toEqual(20);
      expect(state.running).toEqual(10);
      expect(state.rate).toBeGreaterThanOrEqual(0.00249);
      expect(state.timeRemaining).toMatch(/\d+ hours/);
    }

    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });

  it("waitFor must fail when some job fail", async () => {
    const queue = queuePromises({});
    for (let i = 1; i < 100; i++) {
      const fn = (k: number) => {
        queue.enqueue(async () => {
          await sleep(1);
          if (k === 42) throw new Error("some error");
        });
      };
      fn(i);
    }
    expect(queue.state()).not.toBe("idle");
    try {
      await queue.waitFor();
      throw new Error("waitFor must throw an exception");
    } catch (e) {
      expect((e as Error).message).toBe("some error");
    }
    expect(queue.state()).toBe("idle");
  });

  it("should support change concurrency", async () => {
    const queue = queuePromises();
    for (let i = 1; i <= 100; i++) {
      queue.enqueue(async () => (i >= 10 ? sleep(5) : undefined));
    }
    await sleep(1);

    let state = queue.state();
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.running).toEqual(1);
    }

    queue.setConcurrency(10);
    await sleep(1);

    state = queue.state();
    if (typeof state === "string") {
      expect(state).not.toBe("idle or finished");
    } else {
      expect(state.running).toEqual(10);
    }

    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });

  it("shoud support enqueue arrays", async () => {
    const queue = queuePromises();
    let a = false;
    let b = false;
    queue.enqueue([
      async () => {
        await sleep(1);
        a = true;
      },
      async () => {
        await sleep(1);
        b = true;
      },
    ]);
    await queue.waitFor();
    expect(a).toBe(true);
    expect(b).toBe(true);
  });

  it("shoud support promisify arrays", async () => {
    const queue = queuePromises();
    let a = false;
    let b = false;
    const all = await queue.promise([
      async () => {
        await sleep(1);
        a = true;
        return 1;
      },
      async () => {
        await sleep(1);
        b = true;
        return 2;
      },
    ]);
    await queue.waitFor();
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(all).toEqual([1, 2]);
  });
});
