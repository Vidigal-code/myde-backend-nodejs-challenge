import { Injectable } from '@nestjs/common';
import { KbChunk } from './kb.types';
import { KnowledgeBaseService } from './knowledge-base.service';
import { rankChunks } from './rag.util';

const DEFAULT_TOP_K = 3;

/** Recuperação simples (RAG): seleciona os chunks mais relevantes para uma pergunta. */
@Injectable()
export class RagService {
  constructor(private readonly knowledgeBase: KnowledgeBaseService) {}

  retrieve(query: string, topK: number = DEFAULT_TOP_K): KbChunk[] {
    return rankChunks(query, this.knowledgeBase.getChunks(), topK);
  }
}
