import { Response } from 'express';

export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean;
  secureProxy?: boolean;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  encode?: (val: string) => string;
}

export interface CustomCookiesResponse extends Response {
  cookie(name: string, value: string, options?: CookieOptions): this;
  clearCookie(name: string, options?: CookieOptions): this;
}