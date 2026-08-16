import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getGuestCookieOptions } from '../config/cookie.config';

@Injectable()
export class GuestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if user is authenticated
    if (!request.user) {
      // Get or create guest ID from cookie
      let guestId = request.cookies?.guestId;
      console.log('Request cookies:', request.cookies);
      console.log('Guest id:', guestId);

      if (!guestId) {
        guestId = `guest_${uuidv4()}`;
        // Set cookie for 7 days
        const response = context.switchToHttp().getResponse();
        response.cookie('guestId', guestId, getGuestCookieOptions());
      }

      request.headers['x-guest-id'] = guestId;
    }

    return next.handle();
  }
}
