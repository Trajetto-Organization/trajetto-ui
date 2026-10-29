/**
 * The RSC tags the branch list is fetched with.
 *
 * No directive on purpose: the server content spreads this array into its
 * fetch options, and an export of a "use client" module is a client
 * reference on the server — spreading it throws at request time.
 */
const BRANCH_LIST_TAGS = [
  "create-branch",
  "update-branch",
  "delete-branch",
  "toggle-branch-active",
] as const;

type BranchWriteTag = (typeof BRANCH_LIST_TAGS)[number];

export { BRANCH_LIST_TAGS, type BranchWriteTag };
