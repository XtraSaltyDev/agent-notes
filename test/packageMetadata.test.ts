import { readdir, readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

interface PackageJson {
  author?: string;
  exports?: Record<string, unknown>;
  main?: string;
  scripts?: Record<string, string>;
  types?: string;
}

async function readPackageJson(): Promise<PackageJson> {
  return JSON.parse(await readFile("package.json", "utf8")) as PackageJson;
}

describe("package metadata", () => {
  it("does not publish an empty author field", async () => {
    const packageJson = await readPackageJson();

    expect("author" in packageJson).toBe(false);
  });

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

  it("builds dist before tests inspect published JavaScript", async () => {
    const packageJson = await readPackageJson();

    expect(packageJson.scripts?.pretest).toBe("npm run build");
    expect(packageJson.scripts?.test).toBe("vitest run");
  });

  it("bundles package metadata without runtime JSON import attributes", async () => {
    const distFiles = (await readdir("dist"))
      .filter((file) => file.endsWith(".js"))
      .sort();
    const bundledJavaScript = (
      await Promise.all(distFiles.map((file) => readFile(`dist/${file}`, "utf8")))
    ).join("\n");

    expect(bundledJavaScript).not.toMatch(/from\s+["']\.\.\/package\.json["']/);
    expect(bundledJavaScript).not.toMatch(/with\s*\{\s*type:\s*["']json["']\s*\}/);
  });
});
