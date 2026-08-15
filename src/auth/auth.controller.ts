import {
  Controller,
  Post,
  Body,
  Res,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { Public } from '../common/decorators';
import { GuestInterceptor } from 'src/common/interceptors/guest.interceptor';

@Controller('auth')
@UseInterceptors(GuestInterceptor)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Public()
  async register(
    @Body() dto: RegisterDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const guestId = req.cookies?.guestId;
    const result = await this.authService.register(dto, guestId);

    res.cookie('access_token', result.access, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });

    res.cookie('refresh_token', result.refresh, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });

    return res.json({
      data: { user: result.user },
    });
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const result = await this.authService.login(dto);

    res.cookie('access_token', result.access, {
      maxAge: 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });

    res.cookie('refresh_token', result.refresh, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });

    return res.json({
      data: { user: result.user },
    });
  }

  @Post('logout')
  @Public()
  logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      maxAge: 0, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });
    res.clearCookie('refresh_token', {
      maxAge: 0, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ true in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // ✅ critical for cross-origin
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? '.railway.app' : 'localhost',
    });
    return res.json({ message: 'Logged out successfully' });
  }
}
