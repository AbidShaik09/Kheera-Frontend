import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from './auth-service';
import { ApiService, ApiResponse } from './api-service';

describe('AuthService', () => {
  let service: AuthService;
  let apiService: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    postText: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();

    apiService = {
      get: vi.fn(),
      post: vi.fn(),
      postText: vi.fn(),
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
    apiService.postText.mockResolvedValue(apiResponse(200, ' jwt-token '));

    const result = await service.loginWithPassword({
      email: 'abid@example.com',
      password: 'secret',
    });

    expect(apiService.postText).toHaveBeenCalledWith('auth/login', {
      email: 'abid@example.com',
      password: 'secret',
    });
    expect(result).toEqual({ ok: true, status: 200, message: null });
    expect(service.accessToken()).toBe('jwt-token');
    expect(service.isUserLoggedIn()).toBe(true);
  });

  it('returns the backend error text when password login fails', async () => {
    apiService.postText.mockResolvedValue(apiResponse(401, 'Invalid Email Or Password', false));

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

  it('requests a signup OTP through the backend and returns the backend message', async () => {
    apiService.postText.mockResolvedValue(apiResponse(200, 'OTP sent successfully'));

    const result = await service.requestSignupOtp({ email: 'abid@example.com' });

    expect(apiService.postText).toHaveBeenCalledWith('auth/signup-email', {
      email: 'abid@example.com',
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      message: 'OTP sent successfully',
    });
  });

  it('returns backend signup OTP errors without logging in', async () => {
    apiService.postText.mockResolvedValue(apiResponse(409, { message: 'Email already exists' }, false));

    const result = await service.requestSignupOtp({ email: 'abid@example.com' });

    expect(result).toEqual({
      ok: false,
      status: 409,
      message: 'Email already exists',
    });
    expect(service.accessToken()).toBeNull();
    expect(service.isUserLoggedIn()).toBe(false);
  });

  it('validates a signup OTP through the backend', async () => {
    apiService.postText.mockResolvedValue(apiResponse(200, 'OTP verified'));

    const result = await service.verifySignupOtp({
      email: 'abid@example.com',
      otp: 123456,
    });

    expect(apiService.postText).toHaveBeenCalledWith('auth/otp-validation', {
      email: 'abid@example.com',
      otp: 123456,
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      message: 'OTP verified',
    });
  });

  it('stores the returned token after successful signup completion', async () => {
    apiService.postText.mockResolvedValue(apiResponse(200, ' signup-jwt '));

    const result = await service.completeSignup({
      email: 'abid@example.com',
      name: 'Abid Shaik',
      password: 'strong-pass',
      otp: 123456,
    });

    expect(apiService.postText).toHaveBeenCalledWith('auth/signup', {
      email: 'abid@example.com',
      name: 'Abid Shaik',
      password: 'strong-pass',
      otp: 123456,
    });
    expect(result).toEqual({ ok: true, status: 200, message: null });
    expect(service.accessToken()).toBe('signup-jwt');
    expect(service.isUserLoggedIn()).toBe(true);
  });

  it('returns backend signup completion errors without storing a token', async () => {
    apiService.postText.mockResolvedValue(apiResponse(400, 'Invalid OTP', false));

    const result = await service.completeSignup({
      email: 'abid@example.com',
      name: 'Abid Shaik',
      password: 'strong-pass',
      otp: 123456,
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Invalid OTP',
    });
    expect(service.accessToken()).toBeNull();
    expect(service.isUserLoggedIn()).toBe(false);
  });

  it('requests a password reset OTP through the backend', async () => {
    apiService.postText.mockResolvedValue(apiResponse(200, 'OTP sent successfully'));

    const result = await service.requestPasswordResetOtp({ email: 'abid@example.com' });

    expect(apiService.postText).toHaveBeenCalledWith('auth/forgot-password', {
      email: 'abid@example.com',
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      message: 'OTP sent successfully',
    });
  });

  it('returns backend password reset OTP errors without logging in', async () => {
    apiService.postText.mockResolvedValue(apiResponse(400, 'Unable to send OTP', false));

    const result = await service.requestPasswordResetOtp({ email: 'abid@example.com' });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Unable to send OTP',
    });
    expect(service.accessToken()).toBeNull();
    expect(service.isUserLoggedIn()).toBe(false);
  });

  it('stores the returned token after successful password reset', async () => {
    apiService.postText.mockResolvedValue(apiResponse(200, ' reset-jwt '));

    const result = await service.resetPassword({
      email: 'abid@example.com',
      password: 'new-strong-pass',
      otp: 123456,
    });

    expect(apiService.postText).toHaveBeenCalledWith('auth/reset-password', {
      email: 'abid@example.com',
      password: 'new-strong-pass',
      otp: 123456,
    });
    expect(result).toEqual({ ok: true, status: 200, message: null });
    expect(service.accessToken()).toBe('reset-jwt');
    expect(service.isUserLoggedIn()).toBe(true);
  });

  it('returns backend password reset errors without storing a token', async () => {
    apiService.postText.mockResolvedValue(apiResponse(400, { message: 'Invalid OTP' }, false));

    const result = await service.resetPassword({
      email: 'abid@example.com',
      password: 'new-strong-pass',
      otp: 123456,
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Invalid OTP',
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
