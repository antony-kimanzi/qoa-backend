import { Controller, Get, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';
import { Request, Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // test endpoint for debuggng cookies
  @Get('debug/cookies')
  @Public()
  async debugCookies(@Req() req: Request, @Res() res: Response) {
    // Set a test cookie
    res.cookie('test_cookie', 'test_value', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 1000, // 1 minute
    });

    return {
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
      },
      environment: process.env.NODE_ENV,
      message: 'Check your browser cookies!',
    };
  }
}
