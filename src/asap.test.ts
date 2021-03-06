import { sleep, asap } from ".";

describe("asap", () => {
  it("should delay execution function", async () => {
    let value = 1;
    asap(() => {
      value = 2;
    });
    expect(value).toBe(1);
    await sleep(2);
    expect(value).toBe(2);
  });
});
