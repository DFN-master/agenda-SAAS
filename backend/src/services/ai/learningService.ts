import models from '../../models';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing AI learning concepts
 * Allows humans to teach the AI by explaining unknown queries and providing examples
 */

interface TeachConceptInput {
  companyId: string;
  originalQuery: string;
  explanation: string;
  intent?: string;
  examples?: string[];
  keywords?: string[];
  userId: string;
}

interface ConceptMatch {
  conceptId: string;
  originalQuery: string;
  explanation: string;
  intent: string | null;
  examples: string[];
  similarity: number;
  usageCount: number;
  approvedCount: number;
}

/**
 * Teach a new concept to the AI
 * @param data - Concept information including query, explanation, and examples
 * @returns Created concept
 */
export const teachConcept = async (data: TeachConceptInput) => {
  try {
    // Extract keywords from query and explanation if not provided
    const extractedKeywords = data.keywords || extractKeywords(data.originalQuery + ' ' + data.explanation);

    const concept = await models.AiLearnedConcept.create({
      id: uuidv4(),
      company_id: data.companyId,
      original_query: data.originalQuery.trim(),
      explanation: data.explanation.trim(),
      intent: data.intent || null,
      examples: data.examples || [],
      keywords: extractedKeywords,
      created_by_user_id: data.userId,
      usage_count: 0,
      approved_count: 0,
      metadata: {
        source: 'user_training',
        created_at: new Date().toISOString(),
      },
    });

    return concept;
  } catch (error) {
    console.error('Error teaching concept:', error);
    throw error;
  }
};

/**
 * Find similar learned concepts for a given query
 * Uses keyword matching and simple text similarity
 * @param query - User query to find similar concepts for
 * @param companyId - Company ID to filter by
 * @param limit - Maximum number of results
 * @returns Array of matching concepts with similarity scores
 */
export const findSimilarConcepts = async (
  query: string,
  companyId: string,
  limit: number = 5
): Promise<ConceptMatch[]> => {
  try {
    const queryLower = query.toLowerCase().trim();
    const queryTokens = tokenize(queryLower);

    // Get all concepts for the company
    const concepts = await models.AiLearnedConcept.findAll({
      where: { company_id: companyId },
      order: [
        ['usage_count', 'DESC'],
        ['approved_count', 'DESC'],
      ],
    });

    // Calculate similarity for each concept
    const matches: ConceptMatch[] = [];

    for (const concept of concepts) {
      const conceptData = concept.get({ plain: true }) as any;
      
      const conceptText = (
        conceptData.original_query +
        ' ' +
        conceptData.explanation +
        ' ' +
        (conceptData.examples || []).join(' ')
      ).toLowerCase();

      const similarity = calculateTextSimilarity(queryLower, conceptText, queryTokens, conceptData.keywords || []);

      if (similarity > 0.3) {
        matches.push({
          conceptId: conceptData.id,
          originalQuery: conceptData.original_query,
          explanation: conceptData.explanation,
          intent: conceptData.intent,
          examples: conceptData.examples || [],
          similarity: similarity,
          usageCount: conceptData.usage_count,
          approvedCount: conceptData.approved_count,
        });
      }
    }

    // Sort by similarity and usage
    matches.sort((a, b) => {
      const scorA = a.similarity * 0.7 + (a.usageCount / 100) * 0.2 + (a.approvedCount / 100) * 0.1;
      const scorB = b.similarity * 0.7 + (b.usageCount / 100) * 0.2 + (b.approvedCount / 100) * 0.1;
      return scorB - scorA;
    });

    return matches.slice(0, limit);
  } catch (error) {
    console.error('Error finding similar concepts:', error);
    throw error;
  }
};

/**
 * Update concept usage statistics
 * Called when a concept is used to generate a response
 * @param conceptId - ID of the concept that was used
 * @param wasApproved - Whether the response using this concept was approved
 */
export const updateConceptUsage = async (conceptId: string, wasApproved: boolean = false) => {
  try {
    const concept = await models.AiLearnedConcept.findByPk(conceptId);
    if (!concept) {
      throw new Error('Concept not found');
    }

    const conceptData = concept.get({ plain: true }) as any;
    
    const updates: any = {
      usage_count: conceptData.usage_count + 1,
    };

    if (wasApproved) {
      updates.approved_count = conceptData.approved_count + 1;
    }

    await concept.update(updates);
    return concept;
  } catch (error) {
    console.error('Error updating concept usage:', error);
    throw error;
  }
};

/**
 * Get all learned concepts for a company
 * @param companyId - Company ID
 * @param intent - Optional filter by intent
 * @returns Array of concepts
 */
export const getLearnedConcepts = async (companyId: string, intent?: string) => {
  try {
    const where: any = { company_id: companyId };
    if (intent) {
      where.intent = intent;
    }

    const concepts = await models.AiLearnedConcept.findAll({
      where,
      order: [
        ['usage_count', 'DESC'],
        ['created_at', 'DESC'],
      ],
      include: [
        {
          model: models.User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    return concepts;
  } catch (error) {
    console.error('Error fetching learned concepts:', error);
    throw error;
  }
};

/**
 * Delete a learned concept
 * @param conceptId - ID of concept to delete
 * @param companyId - Company ID for authorization
 */
export const deleteConcept = async (conceptId: string, companyId: string) => {
  try {
    const concept = await models.AiLearnedConcept.findOne({
      where: {
        id: conceptId,
        company_id: companyId,
      },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    await concept.destroy();
    return { success: true };
  } catch (error) {
    console.error('Error deleting concept:', error);
    throw error;
  }
};

/**
 * Update an existing learned concept
 * @param conceptId - ID of concept to update
 * @param companyId - Company ID for authorization
 * @param updates - Fields to update
 */
export const updateConcept = async (
  conceptId: string,
  companyId: string,
  updates: {
    explanation?: string;
    intent?: string;
    examples?: string[];
    keywords?: string[];
  }
) => {
  try {
    const concept = await models.AiLearnedConcept.findOne({
      where: {
        id: conceptId,
        company_id: companyId,
      },
    });

    if (!concept) {
      throw new Error('Concept not found');
    }

    await concept.update(updates);
    return concept;
  } catch (error) {
    console.error('Error updating concept:', error);
    throw error;
  }
};

// Helper functions

/**
 * Extract keywords from text
 * Removes common words and returns significant terms
 */
function extractKeywords(text: string): string[] {
  const stopWords = [
    'o',
    'a',
    'os',
    'as',
    'um',
    'uma',
    'de',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
    'nos',
    'nas',
    'por',
    'para',
    'com',
    'sem',
    'sob',
    'e',
    'ou',
    'mas',
    'que',
    'qual',
    'quando',
    'onde',
    'como',
    'é',
    'são',
    'foi',
    'ser',
    'estar',
    'ter',
    'fazer',
    'the',
    'is',
    'at',
    'which',
    'on',
  ];

  const tokens = text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.includes(t));

  // Remove duplicates
  return [...new Set(tokens)];
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Calculate text similarity using token overlap and keyword matching
 * @param query - Query text
 * @param conceptText - Concept full text
 * @param queryTokens - Pre-tokenized query
 * @param conceptKeywords - Concept keywords
 * @returns Similarity score between 0 and 1
 */
function calculateTextSimilarity(
  query: string,
  conceptText: string,
  queryTokens: string[],
  conceptKeywords: string[]
): number {
  const conceptTokens = tokenize(conceptText);

  // Token overlap
  const intersection = queryTokens.filter((t) => conceptTokens.includes(t));
  const union = [...new Set([...queryTokens, ...conceptTokens])];
  const jaccardSimilarity = intersection.length / union.length;

  // Keyword matching
  const keywordMatches = conceptKeywords.filter((kw) => query.includes(kw.toLowerCase()));
  const keywordScore = keywordMatches.length / Math.max(conceptKeywords.length, 1);

  // Substring matching for phrases
  const substringScore = conceptText.includes(query) || query.includes(conceptText.split(' ')[0]) ? 0.3 : 0;

  // Combined score
  return jaccardSimilarity * 0.5 + keywordScore * 0.3 + substringScore * 0.2;
}
