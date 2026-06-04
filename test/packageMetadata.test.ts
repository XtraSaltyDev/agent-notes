import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

interface PackageJson {
  exports?: Record<string, unknown>;
  main?: string;
  types?: string;
}

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(await readFile("package.json", "utf8")) as PackageJson;
}

describe("package metadata", () => {
  it("declares the importable library entry points", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.main).toBe("dist/index.js");
    expect(packageJson.types).toBe("dist/index.d.ts");
    expect(packageJson.exports).toEqual({
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js"
      },
      "./cli": {
        types: "./dist/cli.d.ts",
        import: "./dist/cli.js"
      },
      "./package.json": "./package.json"
    });
  });
});
