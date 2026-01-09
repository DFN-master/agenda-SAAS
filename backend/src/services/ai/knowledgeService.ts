import models from '../../models';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface AddKnowledgeInput {
  companyId: string;
  title: string;
  content: string;
  tags?: string[];
  intent?: string;
  sourceUrl?: string;
  metadata?: any;
}

export async function addKnowledgeEntry(input: AddKnowledgeInput) {
  const { companyId, title, content, tags, intent, sourceUrl, metadata } = input;
  const entry = await (models as any).AiKnowledgeBase.create({
    company_id: companyId,
    title,
    content,
    tags: tags || [],
    intent,
    source_url: sourceUrl,
    metadata,
  });
  return entry;
}

export async function searchKnowledge(
  companyId: string,
  query: string,
  intent?: string,
  limit = 5
) {
  const where: any = { company_id: companyId };

  // Filtro por intent se fornecido
  if (intent) {
    where.intent = intent;
  }

  // Busca simples por palavras-chave no título ou conteúdo (Postgres ILIKE)
  const entries = await (models as any).AiKnowledgeBase.findAll({
    where,
    limit: limit * 3, // pega mais para fazer ranking local
    order: [['updated_at', 'DESC']],
  });

  // Ranking básico: conta quantas palavras do query aparecem no title+content
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = entries.map((entry: any) => {
    const text = `${entry.title} ${entry.content}`.toLowerCase();
    const score = queryWords.reduce(
      (acc, word) => acc + (text.includes(word) ? 1 : 0),
      0
    );
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}

export async function ingestUrlToKnowledge(
  companyId: string,
  url: string,
  title?: string,
  intent?: string
) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch URL: ${res.statusText}`);
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove scripts e styles
    $('script, style, nav, header, footer').remove();

    // Extrai parágrafos
    const paragraphs: string[] = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 30) {
        paragraphs.push(text);
      }
    });

    const content = paragraphs.join('\n\n');
    if (!content) {
      throw new Error('No content extracted from URL');
    }

    const pageTitle = title || $('title').text().trim() || 'Sem título';

    const entry = await addKnowledgeEntry({
      companyId,
      title: pageTitle,
      content,
      tags: ['web-ingest'],
      intent,
      sourceUrl: url,
      metadata: { ingested_at: new Date().toISOString() },
    });

    return entry;
  } catch (error) {
    console.error('[Knowledge] Error ingesting URL:', error);
    throw error;
  }
}

export async function listKnowledge(companyId: string, limit = 50) {
  const entries = await (models as any).AiKnowledgeBase.findAll({
    where: { company_id: companyId },
    order: [['updated_at', 'DESC']],
    limit,
  });
  return entries;
}

export async function deleteKnowledgeEntry(
  entryId: string,
  companyId: string
) {
  const entry = await (models as any).AiKnowledgeBase.findOne({
    where: { id: entryId, company_id: companyId },
  });
  if (!entry) {
    throw new Error('Entry not found or unauthorized');
  }
  await entry.destroy();
  return { success: true };
}
