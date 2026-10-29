/**
 * The queue's react-query root, apart from rules.ts (whose denial-reason
 * schema brings zod): the Torre's cadence reads it on every view's first
 * load. rules.ts re-exports it.
 */
const AUTHORIZATION_QUEUE_ROOT = "occurrence-authorizations";

export { AUTHORIZATION_QUEUE_ROOT };
