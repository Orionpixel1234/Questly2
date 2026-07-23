import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  SpaceStationCollectResult,
  SpaceStationState,
} from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SpaceStationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/space-station`;

  getState() {
    return this.http.get<SpaceStationState>(this.base, {
      withCredentials: true,
    });
  }

  craft(recipeKey: string) {
    return this.http.post<SpaceStationState>(
      `${this.base}/craft`,
      { recipeKey },
      { withCredentials: true },
    );
  }

  place(buildingKey: string, x: number, y: number) {
    return this.http.post<SpaceStationState>(
      `${this.base}/place`,
      { buildingKey, x, y },
      { withCredentials: true },
    );
  }

  collectStation(x: number, y: number, score: number) {
    return this.http.post<SpaceStationCollectResult>(
      `${this.base}/stations/collect`,
      { x, y, score },
      { withCredentials: true },
    );
  }
}
