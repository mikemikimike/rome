#!/usr/bin/env bash
# Refuse to start a dev stack that another checkout owns.
#
# Usage: dev-stack-owner-check.sh <stack home dir> <this checkout's toplevel>
#
# dev-up.sh records the checkout that started a stack in
# <home>/.dev-stack-owner. Its collision check sees only running containers,
# so without this a second checkout pinned to the same ROME_DEV_SLUG could
# take over a stopped stack, its database included, and become its owner.
# A recorded owner that no longer exists on disk (a removed worktree) does not
# block. Removing the owner file hands the stack over on purpose.
set -euo pipefail

home="$1"
this_root="$2"
owner_file="${home}/.dev-stack-owner"

[ -f "$owner_file" ] || exit 0
owner="$(cat "$owner_file")"
[ -n "$owner" ] || exit 0
[ "$owner" = "$this_root" ] && exit 0
[ -d "$owner" ] || exit 0

echo "dev-up: this stack was started from another checkout:" >&2
echo "  ${owner}" >&2
echo "        Run dev:all there, use another ROME_DEV_SLUG, or remove ${owner_file} to take the stack over." >&2
exit 1
