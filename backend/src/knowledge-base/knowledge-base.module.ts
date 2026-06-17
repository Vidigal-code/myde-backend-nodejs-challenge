import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { RagService } from './rag.service';

/** Base de conhecimento + recuperação (RAG). Exporta o RagService para a camada de IA. */
@Module({
  providers: [KnowledgeBaseService, RagService],
  exports: [RagService, KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
