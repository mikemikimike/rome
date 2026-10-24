import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "@rstest/core";
import { OWNER_FILE } from "./gc-stack-guard.js";

const script = join(dirname(fileURLToPath(import.meta.url)), "dev-stack-owner-check.sh");

let root: string;
let home: string;
let mine: string;
let other: string;

function check() {
  return spawnSync("bash", [script, home, mine], { encoding: "utf8" });
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "owner-check-"));
  home = join(root, "home");
  mine = join(root, "mine");
  other = join(root, "other");
  for (const dir of [home, mine, other]) mkdirSync(dir);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("dev-stack-owner-check.sh", () => {
  it("lets a stack with no owner record start", () => {
    expect(check().status).toBe(0);
  });

  it("lets the recorded owner start its own stack", () => {
    writeFileSync(join(home, OWNER_FILE), `${mine}\n`);

    expect(check().status).toBe(0);
  });

  it("refuses a stack another existing checkout owns, even while it is stopped", () => {
    writeFileSync(join(home, OWNER_FILE), `${other}\n`);

    const r = check();

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(other);
    expect(r.stderr).toContain(OWNER_FILE);
  });

  it("lets a stack start when its recorded owner no longer exists", () => {
    writeFileSync(join(home, OWNER_FILE), `${join(root, "removed-worktree")}\n`);

    expect(check().status).toBe(0);
  });
});
