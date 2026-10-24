import { describe, expect, it } from "@rstest/core";
import type { FileChange } from "./changes.js";
import { RunRecorder } from "./run-recorder.js";

describe("RunRecorder app provenance", () => {
  it("keeps successful app targets for the final diff without recording them twice", () => {
    const added: FileChange[] = [];
    const repo = { addChanges: (_id: string, changes: FileChange[]) => added.push(...changes) };
    const recorder = new RunRecorder(repo, "run", "/apps");

    recorder.observe({
      type: "tool_use",
      id: "write",
      tool: "Write",
      input: { file_path: "/apps/notes/src/main.ts", content: "export const ok = true;" },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "write",
      tool: "Write",
      output: "ok",
    });
    recorder.observe({
      type: "tool_use",
      id: "create",
      tool: "execute_action",
      input: {
        action_name: "app_management",
        json_args: {
          op: "create",
          appId: "calendar",
          rootPath: "/apps/calendar",
          template: "default",
        },
      },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "create",
      tool: "execute_action",
      output: '{"status":"ok","data":{"rootPath":"/apps/calendar"}}',
    });

    expect(added).toEqual([]);
    expect([...recorder.knownPaths()]).toEqual(["/apps/notes/src/main.ts", "/apps/calendar"]);
  });

  it("does not attribute failed app writes", () => {
    const recorder = new RunRecorder({ addChanges: () => undefined }, "run", "/apps");
    recorder.observe({
      type: "tool_use",
      id: "failed",
      tool: "Write",
      input: { file_path: "/apps/notes/src/main.ts", content: "not written" },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "failed",
      tool: "Write",
      output: "denied",
      isError: true,
    });

    expect([...recorder.knownPaths()]).toEqual([]);
  });

  it("reads app paths from structured action results", () => {
    const recorder = new RunRecorder({ addChanges: () => undefined }, "run", "/apps");
    recorder.observe({
      type: "tool_use",
      id: "remix",
      tool: "execute_action",
      input: { action_name: "system:app_management", json_args: { op: "create", appId: "notes" } },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "remix",
      tool: "execute_action",
      output: { status: "ok", data: { rootPath: "/apps/notes" } },
    });

    expect([...recorder.knownPaths()]).toEqual(["/apps/notes"]);
  });

  it("does not infer authorship from an install source path", () => {
    const recorder = new RunRecorder({ addChanges: () => undefined }, "run", "/apps");
    recorder.observe({
      type: "tool_use",
      id: "install",
      tool: "execute_action",
      input: {
        action_name: "system:app_management",
        json_args: { op: "install", source: { mode: "source", path: "/apps/notes" } },
      },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "install",
      tool: "execute_action",
      output: { status: "ok", data: { appId: "notes" } },
    });

    expect([...recorder.knownPaths()]).toEqual([]);
  });

  it("does not attribute structured app action errors", () => {
    const recorder = new RunRecorder({ addChanges: () => undefined }, "run", "/apps");
    recorder.observe({
      type: "tool_use",
      id: "failed-create",
      tool: "execute_action",
      input: {
        action_name: "system:app_management",
        json_args: { op: "create", appId: "notes", rootPath: "/apps/notes" },
      },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "failed-create",
      tool: "execute_action",
      output: { status: "error", error: "denied" },
    });

    expect([...recorder.knownPaths()]).toEqual([]);
  });

  it("attributes a Codex deletion and both sides of a rename", () => {
    const recorder = new RunRecorder({ addChanges: () => undefined }, "run", "/apps");
    recorder.observe({
      type: "tool_use",
      id: "file-change",
      tool: "Edit",
      input: {
        type: "fileChange",
        changes: [
          { path: "/apps/notes/src/gone.ts", kind: { type: "delete" }, diff: "-gone\n" },
          {
            path: "/apps/notes/src/old.ts",
            kind: { type: "update", move_path: "/apps/notes/src/new.ts" },
            diff: "@@ -1 +1 @@\n-old\n+new\n",
          },
        ],
      },
    });
    recorder.observe({
      type: "tool_result",
      toolUseId: "file-change",
      tool: "Edit",
      output: "ok",
    });

    expect([...recorder.knownPaths()]).toEqual([
      "/apps/notes/src/gone.ts",
      "/apps/notes/src/old.ts",
      "/apps/notes/src/new.ts",
    ]);
  });
});
