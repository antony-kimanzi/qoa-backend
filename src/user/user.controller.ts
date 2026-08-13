import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { Roles } from '../common/decorators';
import { Role } from '../auth/dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('me')
  @Roles(Role.User, Role.Admin)
  async getProfile(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    const profile = await this.userService.getProfile(user.id);
    return res.json({ data: { user: profile } });
  }

  @Get()
  @Roles(Role.Admin)
  async getAllUsers(@Res() res: Response) {
    const users = await this.userService.getAllUsers();
    return res.json({ data: { users } });
  }

  @Delete('id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.User)
  async deleteUser(
    @Param('id', ParseIntPipe) userId: number,
    @Res() res: Response,
  ) {
    await this.userService.deleteUser(userId);
    return res.json({ data: { success: true } });
  }
}
