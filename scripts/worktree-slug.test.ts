import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "@rstest/core";

const script = join(dirname(fileURLToPath(import.meta.url)), "worktree-slug.sh");

function slug(rome_dev_slug?: string) {
  const env = { ...process.env };
  delete env.ROME_DEV_SLUG;
  if (rome_dev_slug !== undefined) env.ROME_DEV_SLUG = rome_dev_slug;
  const r = spawnSync("bash", [script], { env, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function git(...args: string[]): string {
  return spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
}

describe("worktree-slug.sh", () => {
  it("names the stack after the branch, or the checkout on a detached HEAD, when unset or empty", () => {
    const name = git("branch", "--show-current") || basename(git("rev-parse", "--show-toplevel"));
    const expected = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63);

    expect(slug().stdout).toBe(`${expected}\n`);
    expect(slug("").stdout).toBe(`${expected}\n`);
  });

  it("uses ROME_DEV_SLUG under the same rule", () => {
    expect(slug("rome")).toMatchObject({ status: 0, stdout: "rome\n" });
    expect(slug("Eric Dev/1")).toMatchObject({ status: 0, stdout: "eric-dev-1\n" });
  });

  it("fails loudly when ROME_DEV_SLUG sanitizes to nothing", () => {
    for (const value of ["!!!", "_"]) {
      const r = slug(value);
      expect(r.status).toBe(1);
      expect(r.stdout).toBe("");
      expect(r.stderr).toContain("ROME_DEV_SLUG");
    }
  });
});
