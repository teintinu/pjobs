import { defer, asap } from ".";

describe("defer", () => {
  it("usage sample", async () => {
    const deffered = defer<number>();
    setTimeout(() => deffered.resolve(1), 10);
    setTimeout(() => deffered.reject(new Error("timeout")), 100);
    expect(await deffered.promise).toBe(1);
  });

  it("resolving", async () => {
    const p = defer<number>();
    asap(() => p.resolve(1));
    const v = await p.promise;
    expect(v).toBe(1);
  });

  it("rejecting", async () => {
    const p = defer<number>();
    asap(() => p.reject(new Error("error")));
    try {
      const v = await p.promise;
      expect(v).toBeUndefined();
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(e.message).toBe("error");
    }
  });
});
