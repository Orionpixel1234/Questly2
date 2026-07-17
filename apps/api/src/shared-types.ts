// Re-exports libs/shared-types for the api app. A relative path, not a
// tsconfig alias: apps/api is a standalone Nest CLI project (its own
// package.json/tsconfig, nodenext resolution) outside the Nx graph, so it
// doesn't get the @questly/shared-types alias the analog app resolves via
// vite-tsconfig-paths. Type-only re-export, so nodenext's extension
// requirement for relative runtime imports doesn't apply here.
export type { UserRole, UserProfile } from '../../../libs/shared-types/src/index';
