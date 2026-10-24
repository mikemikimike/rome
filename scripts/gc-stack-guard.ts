/**
 * Which dev stack `gc-worktrees` may tear down along with a worktree.
 *
 * `pnpm dev:all` names a stack after the checkout's branch, or after
 * `ROME_DEV_SLUG` when that is set (see scripts/worktree-slug.sh). One pinned
 * stack can then serve every branch of a checkout, so a merged worktree whose
 * name slugifies to the same value does not own it. Removing that worktree
 * must leave the stack and its home dir alone.
 */

import { realpathSync } from "node:fs";

/** Same rule as scripts/worktree-slug.sh. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

/** The slug `ROME_DEV_SLUG` pins, or null when it pins none. */
export function pinnedSlug(env: NodeJS.ProcessEnv): string | null {
  const slug = slugify(env.ROME_DEV_SLUG ?? "");
  return slug || null;
}

function samePath(a: string, b: string): boolean {
  const real = (p: string) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  return a === b || real(a) === real(b);
}

/**
 * Whether removing the worktree at `worktreePath` may also remove the stack
 * named `slug` and its home dir. Not when this shell pins that slug, and not
 * when the stack's containers were started from another checkout.
 * `ownerDirs` is the compose working directory of each of the stack's
 * containers, empty when it has none.
 */
export function mayTearDownStack(input: {
  slug: string;
  worktreePath: string;
  pinned: string | null;
  ownerDirs: readonly string[];
}): boolean {
  if (input.pinned !== null && input.slug === input.pinned) return false;
  return input.ownerDirs.every((dir) => samePath(dir, input.worktreePath));
}
