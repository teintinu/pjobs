import { queuePromises } from ".";

describe("queuePromises array", () => {
  it("should support forEach function", async () => {
    const queue = queuePromises({
      onProgress(status) {
        console.log("queue status: ", status);
      },
    });
    const array = ["task 1", "task 2"];
    const forEachPromise = queue.forEach(array, async (item, idx, arr) => {
      expect(arr).toBe(arr);
      if (item === "task 1") expect(idx).toBe(0);
      if (item === "task 2") expect(idx).toBe(1);
      console.log(item);
      return Promise.resolve();
    });
    expect(queue.state()).not.toBe("idle");
    await forEachPromise;
    const state = queue.state();
    if (state !== "idle" && state.pending)
      throw new Error("was expected no jobs pending");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });
  it("should support map function", async () => {
    const queue = queuePromises({
      onProgress(status) {
        console.log("queue status: ", status);
      },
    });
    const array = ["task 1", "task 2"];
    const result = queue.map(array, async (item, idx, arr) => {
      expect(array).toBe(arr);
      if (item === "task 1") expect(idx).toBe(0);
      if (item === "task 2") expect(idx).toBe(1);
      console.log(item);
      return Promise.resolve(item.toUpperCase());
    });
    expect(queue.state()).not.toBe("idle");
    expect(await result).toEqual(["TASK 1", "TASK 2"]);
    const state = queue.state();
    if (state !== "idle" && state.pending)
      throw new Error("was expected no jobs pending");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });
  it("should support map changing type", async () => {
    const queue = queuePromises({
      onProgress(status) {
        console.log("queue status: ", status);
      },
    });
    const array = ["task 1", "task 2"];
    const result = queue.map(array, async (item, idx, arr) => {
      expect(arr).toBe(arr);
      return Promise.resolve(parseInt(item.substring(5), 10));
    });
    expect(queue.state()).not.toBe("idle");
    expect(await result).toEqual([1, 2]);
    const state = queue.state();
    if (state !== "idle" && state.pending)
      throw new Error("was expected no jobs pending");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });
  it("should support reduce function", async () => {
    const queue = queuePromises({
      onProgress(status) {
        console.log("queue status: ", status);
      },
    });
    const array = ["a", "bb", "ccc"];
    const result = queue.reduce(
      array,
      async (ret, item, idx, arr) => {
        expect(array).toBe(arr);
        expect(idx).toBe(item.length - 1);
        return Promise.resolve(ret + item.length);
      },
      0
    );
    expect(queue.state()).not.toBe("idle");
    expect(await result).toEqual(6);
    const state = queue.state();
    if (state !== "idle" && state.pending)
      throw new Error("was expected no jobs pending");
    await queue.waitFor();
    expect(queue.state()).toBe("idle");
  });
  describe("should support some function", () => {
    it("should return value on found", async () => {
      const queue = queuePromises({
        onProgress(status) {
          console.log("queue status: ", status);
        },
      });
      const array = ["task 1", "task 2", "task 3", "task 42"];
      let count = 0;
      const result = queue.some(array, async (item, idx, arr) => {
        expect(arr).toBe(arr);
        expect(idx).toBe(count);
        count++;
        console.log(item);
        return Promise.resolve(item.includes("2"));
      });
      expect(queue.state()).not.toBe("idle");
      expect(await result).toEqual("task 2");
      await queue.waitFor();
      expect(queue.state()).toBe("idle");
      expect(count).toBe(2);
    });
    it("should return undefined when no found", async () => {
      const queue = queuePromises({
        onProgress(status) {
          console.log("queue status: ", status);
        },
      });
      const array = ["task 1", "task 2", "task 3", "task 42"];
      let count = 0;
      const result = queue.some(array, async (item, idx, arr) => {
        expect(arr).toBe(arr);
        expect(idx).toBe(count);
        count++;
        console.log(item);
        return Promise.resolve(item.includes("5"));
      });
      expect(queue.state()).not.toBe("idle");
      expect(await result).toBeUndefined();
      await queue.waitFor();
      expect(queue.state()).toBe("idle");
      expect(count).toBe(4);
    });
  });
});
