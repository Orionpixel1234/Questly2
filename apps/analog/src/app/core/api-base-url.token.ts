import { InjectionToken } from '@angular/core';

// VITE_API_BASE_URL is inlined at build time (e.g. set in the Cloudflare
// Pages build config) so prod points at the Railway-hosted API; falls back
// to the local NestJS dev server when unset.
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000/api/v1',
});
