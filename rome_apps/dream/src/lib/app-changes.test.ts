import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "@rstest/core";
import { appChangesSince, attributeAppChanges, snapshotApps } from "./app-changes.js";

describe("appChangesSince attribution", () => {
  const roots: string[] = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("separates known practice paths from other filesystem changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "dream-app-changes-"));
    const copy = await mkdtemp(join(tmpdir(), "dream-app-snapshot-"));
    roots.push(root, copy);
    const known = join(root, "notes", "src", "known.ts");
    const other = join(root, "calendar", "src", "other.ts");
    await mkdir(join(root, "notes", "src"), { recursive: true });
    await mkdir(join(root, "calendar", "src"), { recursive: true });
    await writeFile(known, "before");
    await writeFile(other, "before");
    const before = await snapshotApps(root, copy);

    await writeFile(known, "practice changed");
    await writeFile(other, "concurrent changed");

    const changes = attributeAppChanges(await appChangesSince(root, before), {
      practicePaths: new Set([join(root, "notes")]),
      concurrentWriterPaths: new Set([join(root, "calendar")]),
      concurrentWriterPathUnknown: false,
    });
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: known, attribution: "practice" }),
        expect.objectContaining({ path: other, attribution: "unattributed" }),
      ]),
    );
  });

  it("marks a file mixed when both practice and a concurrent writer touched its app", async () => {
    const root = await mkdtemp(join(tmpdir(), "dream-app-changes-"));
    const copy = await mkdtemp(join(tmpdir(), "dream-app-snapshot-"));
    roots.push(root, copy);
    const app = join(root, "calendar");
    const shared = join(app, "src", "shared.ts");
    const other = join(app, "src", "other.ts");
    await mkdir(join(app, "src"), { recursive: true });
    const before = await snapshotApps(root, copy);
    await writeFile(shared, "practice's final content");
    await writeFile(other, "concurrent scaffold content");

    const changes = attributeAppChanges(await appChangesSince(root, before), {
      practicePaths: new Set([shared]),
      concurrentWriterPaths: new Set([app]),
      concurrentWriterPathUnknown: false,
    });

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: shared, attribution: "mixed" }),
        expect.objectContaining({ path: other, attribution: "unattributed" }),
      ]),
    );
  });

  it("does not claim practice authorship when a concurrent writer path is unknown", async () => {
    const root = await mkdtemp(join(tmpdir(), "dream-app-changes-"));
    const copy = await mkdtemp(join(tmpdir(), "dream-app-snapshot-"));
    roots.push(root, copy);
    const path = join(root, "notes", "src", "known.ts");
    await mkdir(join(root, "notes", "src"), { recursive: true });
    const before = await snapshotApps(root, copy);
    await writeFile(path, "changed");

    const changes = attributeAppChanges(await appChangesSince(root, before), {
      practicePaths: new Set([path]),
      concurrentWriterPaths: new Set(),
      concurrentWriterPathUnknown: true,
    });

    expect(changes).toContainEqual(expect.objectContaining({ path, attribution: "unattributed" }));
  });

  it("keeps a deleted known path attributed to practice", async () => {
    const root = await mkdtemp(join(tmpdir(), "dream-app-changes-"));
    const copy = await mkdtemp(join(tmpdir(), "dream-app-snapshot-"));
    roots.push(root, copy);
    const known = join(root, "notes", "src", "gone.ts");
    await mkdir(join(root, "notes", "src"), { recursive: true });
    await writeFile(known, "before");
    const before = await snapshotApps(root, copy);
    await rm(known);

    const changes = attributeAppChanges(await appChangesSince(root, before), {
      practicePaths: new Set([join(root, "notes")]),
      concurrentWriterPaths: new Set(),
      concurrentWriterPathUnknown: false,
    });

    expect(changes).toContainEqual(
      expect.objectContaining({ path: known, attribution: "practice", content: "" }),
    );
  });
});
