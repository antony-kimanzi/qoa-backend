import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { IS_GUEST_KEY } from 'src/common/decorators/guest.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private jwt: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route allows guest access
    const isGuest = this.reflector.getAllAndOverride<boolean>(IS_GUEST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    let token = this.extractTokenFromCookies(request);

    // If no access token, try to refresh
    if (!token) {
      const refreshToken = this.extractRefreshTokenFromCookies(request);

      if (refreshToken) {
        try {
          const result = await this.authService.refreshToken(refreshToken);

          // Set new tokens in cookies
          this.setAccessTokenCookie(response, result.access);
          this.setRefreshTokenCookie(response, result.refresh);

          token = result.access;
        } catch (error) {
          console.error('Refresh error:', error);
          throw new UnauthorizedException('Invalid or expired refresh token');
        }
      }
    }

    // If no token after refresh attempt and route allows guest, allow access (guest interceptor will handle it)
    if (!token && isGuest) {
      return true;
    } else if (!token && !isGuest) {
      throw new UnauthorizedException('Authentication required');
    }

    // Verify the token
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: process.env.ACCESS_TOKEN_SECRET,
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Auth error:', error.message);
      } else {
        console.error('Auth error:', error);
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromCookies(request: Request): string | undefined {
    return request.cookies?.access_token;
  }

  private extractRefreshTokenFromCookies(request: Request): string | undefined {
    return request?.cookies?.refresh_token;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private setAccessTokenCookie(response: Response, token: string): void {
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
