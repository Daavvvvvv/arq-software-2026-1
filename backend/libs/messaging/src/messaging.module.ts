import { Module, Global } from '@nestjs/common';
import { SnsService } from './sns.service';
import { SqsService } from './sqs.service';

@Global()
@Module({
  providers: [SnsService, SqsService],
  exports: [SnsService, SqsService],
})
export class MessagingModule {}
