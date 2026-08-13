import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private emailService: EmailService) {
    super();
  }

  async process(job: Job<{ email: string; username: string }>): Promise<any> {
    const { email, username } = job.data;

    this.logger.debug(
      `📧 Processing welcome email for ${email} (Job ID: ${job.id})`,
    );

    try {
      // Send the email
      const result = await this.emailService.sendWelcomeEmail(email, username);

      // If you want to update progress
      await job.updateProgress(100);

      this.logger.log(`✅ Welcome email sent to ${email}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${email}:`, error instanceof Error ? error.message : String(error));
      throw error; // BullMQ will retry automatically
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`📧 Job ${job.id} is now active`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`❌ Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`📊 Job ${job.id} progress: ${progress}%`);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.warn(`⚠️ Job ${job.id} stalled`);
  }
}
