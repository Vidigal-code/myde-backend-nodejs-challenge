import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { AppConfigService } from '@/config/app-config.service';
import { KbChunk } from './kb.types';
import { splitMarkdownIntoChunks } from './rag.util';

/** Carrega e mantém em memória os chunks dos arquivos *.md da base de conhecimento. */
@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private chunks: KbChunk[] = [];

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  /** (Re)carrega todos os markdowns do diretório configurado. */
  async load(): Promise<void> {
    const dir = this.resolveDir();
    try {
      const files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
      const loaded: KbChunk[] = [];
      for (const file of files) {
        const content = await readFile(join(dir, file), 'utf8');
        loaded.push(...splitMarkdownIntoChunks(content, file));
      }
      this.chunks = loaded;
      this.logger.log(`base de conhecimento carregada: ${files.length} arquivo(s), ${loaded.length} chunk(s)`);
    } catch (err) {
      this.logger.error(`falha ao carregar a base de conhecimento em ${dir}: ${String(err)}`);
      this.chunks = [];
    }
  }

  getChunks(): KbChunk[] {
    return this.chunks;
  }

  private resolveDir(): string {
    const configured = this.config.knowledgeBaseDir;
    return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
  }
}
