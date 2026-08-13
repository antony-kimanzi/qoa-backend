import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue('email-queue') private emailQueue: Queue,
  ) {}

  async addToQueue(email: string, username: string): Promise<void> {
    try {
      const job = await this.emailQueue.add('send-welcome', {
        email,
        username,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
      
      this.logger.debug(`📧 Email queued for ${email} (Job ID: ${job.id})`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to queue email for ${email}: ${errMsg}`, errStack);
    }
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async getJobs(limit = 10) {
    return this.emailQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, limit);
  }

  async cleanQueue() {
    // Clean completed jobs older than 1 hour
    await this.emailQueue.clean(3600 * 1000, 1000, 'completed');
    // Clean failed jobs older than 7 days
    await this.emailQueue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
    this.logger.log('🧹 Queue cleaned');
  }

  async retryFailedJobs() {
    const failedJobs = await this.emailQueue.getJobs(['failed']);
    for (const job of failedJobs) {
      await job.retry();
    }
    this.logger.log(`🔄 Retrying ${failedJobs.length} failed jobs`);
  }
}