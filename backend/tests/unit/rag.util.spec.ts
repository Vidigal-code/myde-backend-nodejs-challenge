import { rankChunks, splitMarkdownIntoChunks } from '@/knowledge-base/rag.util';

describe('rag.util', () => {
  const markdown = [
    '# Planos e Preços',
    'Fibra Start 300 Mbps por R$ 79,90 com Wi-Fi 6.',
    '## Suporte',
    'Atendimento via WhatsApp das 8h às 22h.',
  ].join('\n');

  const chunks = splitMarkdownIntoChunks(markdown, 'kb.md');

  it('quebra o markdown por seções de cabeçalho', () => {
    expect(chunks).toHaveLength(2);
    expect(chunks[0].title).toBe('Planos e Preços');
    expect(chunks[1].title).toBe('Suporte');
  });

  it('recupera o chunk mais relevante para a pergunta', () => {
    const result = rankChunks('quais os planos de fibra e preço', chunks, 3);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe('Planos e Preços');
  });

  it('retorna vazio quando nada é relevante (base para "não sei")', () => {
    expect(rankChunks('xyzzy plugh', chunks, 3)).toEqual([]);
  });
});
