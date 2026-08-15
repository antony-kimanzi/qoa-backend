import { SetMetadata } from '@nestjs/common';

export const IS_GUEST_KEY = 'isGuest';
export const Guest = () => SetMetadata(IS_GUEST_KEY, true);
