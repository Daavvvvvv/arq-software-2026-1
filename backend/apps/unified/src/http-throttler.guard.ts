import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    const type = context.getType();
    if (type !== 'http') return Promise.resolve(true);
    return super.canActivate(context) as Promise<boolean>;
  }
}
