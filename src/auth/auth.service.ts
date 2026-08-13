import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto, RegisterDto } from './dto';
import * as argon2 from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GuestService } from 'src/guest/guest.service';
import { EmailQueueService } from 'src/email/email-queue.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailQueue: EmailQueueService,
    private guestService: GuestService,
  ) {}

  async register(dto: RegisterDto, guestId?: string) {
    if (dto === undefined) {
      throw new BadRequestException("Body can't be undefined");
    }

    const hashedPassword = await argon2.hash(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          role: dto.role || 'User',
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      });

      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = await this.jwt.signAsync(payload, {
        expiresIn: '1d',
        secret: process.env.ACCESS_TOKEN_SECRET,
      });
      const refreshToken = await this.jwt.signAsync(payload, {
        expiresIn: '7d',
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      // Transfer guest cart to user cart if guestId exists
      if (guestId) {
        await this.guestService.transferGuestCartToUser(guestId, user.id);
      }

      // Queue welcome email (non-blocking - ~1ms)
      this.emailQueue.addToQueue(user.email, user.username);

      return {
        access: accessToken,
        refresh: refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: any) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Credentials taken');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found. Check your credentials');
    }

    try {
      const isValid = await argon2.verify(user.password, dto.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error: any) {
      console.error('Password verification error:', error.message);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      secret: process.env.ACCESS_TOKEN_SECRET,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.REFRESH_TOKEN_SECRET,
    });

    return {
      access: accessToken,
      refresh: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const newAccessToken = await this.jwt.signAsync(newPayload, {
        expiresIn: '1d',
        secret: process.env.ACCESS_TOKEN_SECRET,
      });
      const newRefreshToken = await this.jwt.signAsync(newPayload, {
        expiresIn: '7d',
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      return { access: newAccessToken, refresh: newRefreshToken };
    } catch (error: any) {
      console.error('Refresh token error:', error.message);
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Refresh token has expired. Please login again',
        );
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token format');
      }
      throw new UnauthorizedException('Refresh token expired or is invalid');
    }
  }
}
