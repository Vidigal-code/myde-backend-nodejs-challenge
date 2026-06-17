import { KbChunk } from './kb.types';

/** Stopwords PT/EN comuns que não ajudam na relevância. */
const STOPWORDS = new Set([
  'a','o','os','as','de','da','do','das','dos','e','que','em','um','uma','para','por',
  'com','no','na','nos','nas','se','ao','aos','the','of','to','and','is','in','for','my',
  'quais','qual','como','quanto','quando','onde','voces','vocês','meu','minha',
]);

/** Normaliza texto: minúsculas, sem acentos, tokens alfanuméricos relevantes. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Pontua um chunk pela quantidade de termos da query presentes no texto. */
export function scoreChunk(queryTerms: string[], chunk: KbChunk): number {
  if (queryTerms.length === 0) return 0;
  const haystack = new Set(tokenize(`${chunk.title} ${chunk.text}`));
  return queryTerms.reduce((score, term) => score + (haystack.has(term) ? 1 : 0), 0);
}

/** Retorna os top-K chunks mais relevantes (score > 0), do mais para o menos relevante. */
export function rankChunks(query: string, chunks: KbChunk[], topK: number): KbChunk[] {
  const terms = Array.from(new Set(tokenize(query)));
  return chunks
    .map((chunk) => ({ chunk, score: scoreChunk(terms, chunk) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => entry.chunk);
}

/** Quebra um markdown em chunks por seção (cabeçalhos `#`/`##`...). */
export function splitMarkdownIntoChunks(content: string, source: string): KbChunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: KbChunk[] = [];
  let title = source;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (text.length > 0) chunks.push({ source, title, text });
    buffer = [];
  };

  for (const line of lines) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      title = heading[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return chunks;
}
