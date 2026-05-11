/**
 * Production builds never ship demo/mock seed data.
 * Development uses mock data only when initializing a missing local store file.
 */
export function isProductionBuild(): boolean {
  return process.env.NODE_ENV === "production";
}
