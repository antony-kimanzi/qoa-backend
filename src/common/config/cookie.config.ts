// src/common/config/cookie.config.ts
import { CookieOptions } from 'express';

export const getCookieOptions = (): CookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: true, // Always true for cross-origin in production
    sameSite: 'none', // Always 'none' for cross-origin
    path: '/',
    // DON'T set domain for Railway - it causes issues
    // domain: isProduction ? '.railway.app' : 'localhost',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

export const getGuestCookieOptions = (): CookieOptions => {
  return {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

export const getAccessTokenCookieOptions = (): CookieOptions => {
  return {
    ...getCookieOptions(),
    maxAge: 15 * 60 * 1000, // 15 minutes
  };
};

export const getRefreshTokenCookieOptions = (): CookieOptions => {
  return {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

// For clearing cookies
export const clearCookieOptions = (): CookieOptions => {
  return {
    ...getCookieOptions(),
    maxAge: 0,
  };
};
