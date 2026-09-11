import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from './auth-service';
import { ApiService, ApiResponse } from './api-service';

describe('AuthService', () => {
  let service: AuthService;
  let apiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();

    apiService = {
      get: vi.fn(),
      post: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: apiService }],
    });

    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('starts logged out when no token exists', () => {
    expect(service.isUserLoggedIn()).toBe(false);
  });

  it('does not request the current user when there is no token', async () => {
    const result = await service.loginStatus();

    expect(result).toBe(false);
    expect(apiService.get).not.toHaveBeenCalled();
  });

  it('stores the returned token after a successful password login', async () => {
    apiService.post.mockResolvedValue(apiResponse(200, ' jwt-token '));

    const result = await service.loginWithPassword({
      email: 'abid@example.com',
      password: 'secret',
    });

    expect(apiService.post).toHaveBeenCalledWith('auth/login', {
      email: 'abid@example.com',
      password: 'secret',
    });
    expect(result).toEqual({ ok: true, status: 200, message: null });
    expect(service.accessToken()).toBe('jwt-token');
    expect(service.isUserLoggedIn()).toBe(true);
  });

  it('returns the backend error text when password login fails', async () => {
    apiService.post.mockResolvedValue(apiResponse(401, 'Invalid Email Or Password', false));

    const result = await service.loginWithPassword({
      email: 'abid@example.com',
      password: 'wrong',
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      message: 'Invalid Email Or Password',
    });
    expect(service.accessToken()).toBeNull();
    expect(service.isUserLoggedIn()).toBe(false);
  });
});

function apiResponse<T>(status: number, body: T, ok = true): ApiResponse<T> {
  return {
    ok,
    status,
    body,
    headers: null,
    error: null,
  };
}
