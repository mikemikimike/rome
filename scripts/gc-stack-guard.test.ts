import { describe, expect, it } from "@rstest/core";
import { mayTearDownStack, pinnedSlug } from "./gc-stack-guard.js";

describe("mayTearDownStack", () => {
  const worktree = "/src/rome-worktrees/shared";

  it("keeps the stack this shell pins, even for a worktree of the same name", () => {
    expect(
      mayTearDownStack({
        slug: "shared",
        worktreePath: worktree,
        pinned: "shared",
        ownerDirs: [worktree],
      }),
    ).toBe(false);
  });

  it("keeps a stack started from another checkout", () => {
    expect(
      mayTearDownStack({
        slug: "shared",
        worktreePath: worktree,
        pinned: null,
        ownerDirs: ["/src/rome"],
      }),
    ).toBe(false);
  });

  it("tears down a stack the worktree started itself", () => {
    expect(
      mayTearDownStack({
        slug: "shared",
        worktreePath: worktree,
        pinned: null,
        ownerDirs: [worktree],
      }),
    ).toBe(true);
  });

  it("keeps the stack when Docker cannot say who owns it", () => {
    expect(
      mayTearDownStack({ slug: "shared", worktreePath: worktree, pinned: null, ownerDirs: null }),
    ).toBe(false);
  });

  it("keeps the stack when no container proves an owner", () => {
    expect(
      mayTearDownStack({ slug: "shared", worktreePath: worktree, pinned: null, ownerDirs: [] }),
    ).toBe(false);
  });
});

describe("pinnedSlug", () => {
  it("applies the slug rule, and pins nothing when it is unset or sanitizes to empty", () => {
    expect(pinnedSlug({ ROME_DEV_SLUG: "Eric Dev/1" })).toBe("eric-dev-1");
    expect(pinnedSlug({})).toBeNull();
    expect(pinnedSlug({ ROME_DEV_SLUG: "!!!" })).toBeNull();
  });
});
