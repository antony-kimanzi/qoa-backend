import { Module } from '@nestjs/common';
import { GuestService } from './guest.service';

@Module({
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
