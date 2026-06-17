import { Module } from '@nestjs/common';
import { MessagingModule } from '@/messaging/messaging.module';
import { KnowledgeBaseModule } from '@/knowledge-base/knowledge-base.module';
import { AiModule } from '@/ai/ai.module';
import { MetaModule } from '@/meta/meta.module';
import { AuditModule } from '@/audit/audit.module';
import { InboundProcessor } from './inbound-processor.service';

/** Agrega os processadores consumidos pelo worker (inbound + auditoria). */
@Module({
  imports: [MessagingModule, KnowledgeBaseModule, AiModule, MetaModule, AuditModule],
  providers: [InboundProcessor],
  exports: [InboundProcessor, AuditModule],
})
export class ProcessingModule {}
