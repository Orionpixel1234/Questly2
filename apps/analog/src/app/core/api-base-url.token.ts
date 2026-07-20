import { InjectionToken } from '@angular/core';

// Hardcoded dev default for now — becomes a real per-environment value once
// there's a build pipeline that needs one (staging/prod).
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://localhost:3000/api/v1',
});
