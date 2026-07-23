import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  AsteroidAnswerResult,
  AsteroidQuestion,
  OutpostState,
  StationCollectResult,
} from '@questly/shared-types';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class OutpostApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/outpost`;

  getState() {
    return this.http.get<OutpostState>(this.base, { withCredentials: true });
  }

  craft(recipeKey: string) {
    return this.http.post<OutpostState>(
      `${this.base}/craft`,
      { recipeKey },
      { withCredentials: true },
    );
  }

  place(buildingKey: string, x: number, y: number) {
    return this.http.post<OutpostState>(
      `${this.base}/place`,
      { buildingKey, x, y },
      { withCredentials: true },
    );
  }

  collectStation(x: number, y: number, score: number) {
    return this.http.post<StationCollectResult>(
      `${this.base}/stations/collect`,
      { x, y, score },
      { withCredentials: true },
    );
  }

  claimQuest(questKey: string) {
    return this.http.post<OutpostState>(
      `${this.base}/quests/${questKey}/claim`,
      {},
      { withCredentials: true },
    );
  }

  startAsteroidMining() {
    return this.http.post<AsteroidQuestion>(
      `${this.base}/asteroid/start`,
      {},
      { withCredentials: true },
    );
  }

  answerAsteroidMining(attemptId: string, answer: string) {
    return this.http.post<AsteroidAnswerResult>(
      `${this.base}/asteroid/answer`,
      { attemptId, answer },
      { withCredentials: true },
    );
  }
}
