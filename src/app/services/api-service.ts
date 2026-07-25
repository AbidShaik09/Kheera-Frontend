import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config-service';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  body: T | null;
  headers: HttpHeaders | null;
  error: HttpErrorResponse | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get api(): string {
    return this.config.apiUrl;
  }

  async get<T>(url: string, params?: HttpParams): Promise<ApiResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.http.get<T>(`${this.api}${url}`, {
          params,
          observe: 'response',
        }),
      );

      return {
        ok: true,
        status: response.status,
        body: response.body,
        headers: response.headers,
        error: null,
      };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.http.post<T>(`${this.api}${url}`, body, {
          observe: 'response',
        }),
      );

      return {
        ok: true,
        status: response.status,
        body: response.body,
        headers: response.headers,
        error: null,
      };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async put<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.http.put<T>(`${this.api}${url}`, body, {
          observe: 'response',
        }),
      );

      return {
        ok: true,
        status: response.status,
        body: response.body,
        headers: response.headers,
        error: null,
      };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async patch<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.http.patch<T>(`${this.api}${url}`, body, {
          observe: 'response',
        }),
      );

      return {
        ok: true,
        status: response.status,
        body: response.body,
        headers: response.headers,
        error: null,
      };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await firstValueFrom(
        this.http.delete<T>(`${this.api}${url}`, {
          observe: 'response',
        }),
      );

      return {
        ok: true,
        status: response.status,
        body: response.body,
        headers: response.headers,
        error: null,
      };
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  private handleError<T>(error: unknown): ApiResponse<T> {
    if (error instanceof HttpErrorResponse) {
      return {
        ok: false,
        status: error.status,
        body: error.error ?? null,
        headers: error.headers,
        error,
      };
    }

    return {
      ok: false,
      status: 0,
      body: null,
      headers: null,
      error: null,
    };
  }
}
