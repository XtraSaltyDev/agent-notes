import * as publicApi from "../src/index.js";

describe("public library entry point", () => {
  it("exports write and update workflow helpers", () => {
    expect(publicApi.planWrites).toBeTypeOf("function");
    expect(publicApi.writeFiles).toBeTypeOf("function");
    expect(publicApi.planUpdates).toBeTypeOf("function");
    expect(publicApi.writeUpdates).toBeTypeOf("function");
  });
});
