import { Book } from '../types';

/**
 * Enhanced confidence scoring for extracted books.
 * Combines heuristic scoring with LLM-provided confidence scores
 */

export interface ConfidenceFactors {
  titleQuality: number;
  authorQuality: number;
  contextQuality: number;
  linksPresent: number;
  llmConfidence?: number;
  episodeRelevance?: number;
  extractionMethod?: 'simple' | 'multi-pass';
}

export interface ConfidenceResult {
  score: number;
  factors: ConfidenceFactors;
  reasoning: string;
  needsReview: boolean;
}

/**
 * Analyze title quality based on various factors
 */
const analyzeTitleQuality = (title: string): number => {
  if (!title || title.trim().length === 0) return 0;
  
  const cleanTitle = title.trim();
  let score = 0.5; // Base score
  
  // Length scoring
  if (cleanTitle.length > 3) score += 0.2;
  if (cleanTitle.length > 10) score += 0.1;
  
  // Quality indicators
  if (cleanTitle.match(/^[A-Z]/)) score += 0.1; // Proper capitalization
  if (!cleanTitle.match(/^\d+$/)) score += 0.1; // Not just numbers
  if (cleanTitle.includes(':')) score += 0.05; // Subtitle indicator
  if (cleanTitle.match(/[A-Za-z]{3,}/)) score += 0.05; // Contains real words
  
  return Math.min(score, 1.0);
};

/**
 * Analyze author quality based on various factors
 */
const analyzeAuthorQuality = (author: string): number => {
  if (!author || author.trim().length === 0) return 0;
  
  const cleanAuthor = author.trim();
  let score = 0.5; // Base score
  
  // Length and format scoring
  if (cleanAuthor.length > 3) score += 0.2;
  if (cleanAuthor.includes(' ')) score += 0.2; // Has first and last name
  if (cleanAuthor.match(/^[A-Z][a-z]+ [A-Z][a-z]+/)) score += 0.1; // Proper name format
  
  return Math.min(score, 1.0);
};

/**
 * Analyze context quality
 */
const analyzeContextQuality = (context?: string): number => {
  if (!context || context.trim().length === 0) return 0;
  
  const cleanContext = context.trim();
  let score = 0.3; // Base score for having context
  
  // Length scoring
  if (cleanContext.length > 20) score += 0.2;
  if (cleanContext.length > 50) score += 0.2;
  if (cleanContext.length > 100) score += 0.1;
  
  // Quality indicators
  if (cleanContext.includes('episode')) score += 0.1;
  if (cleanContext.includes('discuss') || cleanContext.includes('based on')) score += 0.1;
  if (cleanContext.match(/because|since|as|explains|describes/i)) score += 0.1;
  
  return Math.min(score, 1.0);
};

/**
 * Calculate combined confidence score
 */
export const calculateEnhancedConfidence = (
  book: Book,
  llmConfidence?: number,
  extractionMethod?: 'simple' | 'multi-pass'
): ConfidenceResult => {
  const factors: ConfidenceFactors = {
    titleQuality: analyzeTitleQuality(book.title),
    authorQuality: analyzeAuthorQuality(book.author),
    contextQuality: analyzeContextQuality(book.context),
    linksPresent: (book.extractedLinks && book.extractedLinks.length > 0) ? 0.1 : 0,
    llmConfidence,
    extractionMethod
  };

  // Base heuristic score (40% weight)
  const heuristicScore = (
    factors.titleQuality * 0.3 +
    factors.authorQuality * 0.3 +
    factors.contextQuality * 0.3 +
    factors.linksPresent * 0.1
  ) * 0.4;

  // LLM confidence score (50% weight if available)
  const llmScore = llmConfidence ? (llmConfidence * 0.5) : (heuristicScore * 1.25);

  // Extraction method bonus (10% weight)
  const methodBonus = extractionMethod === 'multi-pass' ? 0.1 : 0.05;

  // Combined score
  let finalScore = heuristicScore + llmScore + methodBonus;
  finalScore = Math.min(finalScore, 1.0);
  finalScore = Math.max(finalScore, 0.0);

  // Determine if needs review
  const needsReview = finalScore < 0.7 || 
                     factors.titleQuality < 0.5 || 
                     factors.authorQuality < 0.5 ||
                     (!llmConfidence && extractionMethod !== 'multi-pass');

  // Generate reasoning
  const reasoning = generateConfidenceReasoning(factors, finalScore, needsReview);

  return {
    score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
    factors,
    reasoning,
    needsReview
  };
};

/**
 * Generate human-readable reasoning for confidence score
 */
const generateConfidenceReasoning = (
  factors: ConfidenceFactors,
  score: number,
  needsReview: boolean
): string => {
  const reasons: string[] = [];

  // Title quality
  if (factors.titleQuality >= 0.8) {
    reasons.push('excellent title quality');
  } else if (factors.titleQuality >= 0.6) {
    reasons.push('good title quality');
  } else if (factors.titleQuality >= 0.3) {
    reasons.push('moderate title quality');
  } else {
    reasons.push('poor title quality');
  }

  // Author quality
  if (factors.authorQuality >= 0.8) {
    reasons.push('excellent author information');
  } else if (factors.authorQuality >= 0.6) {
    reasons.push('good author information');
  } else if (factors.authorQuality >= 0.3) {
    reasons.push('basic author information');
  } else {
    reasons.push('poor author information');
  }

  // Context quality
  if (factors.contextQuality >= 0.7) {
    reasons.push('detailed context provided');
  } else if (factors.contextQuality >= 0.4) {
    reasons.push('basic context provided');
  } else if (factors.contextQuality > 0) {
    reasons.push('minimal context');
  } else {
    reasons.push('no context provided');
  }

  // LLM confidence
  if (factors.llmConfidence) {
    if (factors.llmConfidence >= 0.8) {
      reasons.push('high LLM confidence');
    } else if (factors.llmConfidence >= 0.6) {
      reasons.push('moderate LLM confidence');
    } else {
      reasons.push('low LLM confidence');
    }
  }

  // Extraction method
  if (factors.extractionMethod === 'multi-pass') {
    reasons.push('multi-pass extraction');
  }

  // Links
  if (factors.linksPresent > 0) {
    reasons.push('direct links found');
  }

  let reasoning = `Confidence: ${(score * 100).toFixed(0)}% - ${reasons.join(', ')}`;
  
  if (needsReview) {
    reasoning += '. Requires manual review.';
  }

  return reasoning;
};

/**
 * Legacy confidence scoring function (preserved for backward compatibility)
 */
export const scoreBookConfidence = (book: Book): number => {
  const result = calculateEnhancedConfidence(book);
  return result.score;
};

/**
 * Batch confidence scoring for multiple books
 */
export const scoreMultipleBooks = (
  books: Book[],
  extractionMetadata?: {
    llmConfidences?: number[];
    extractionMethod?: 'simple' | 'multi-pass';
  }
): ConfidenceResult[] => {
  return books.map((book, index) => {
    const llmConfidence = extractionMetadata?.llmConfidences?.[index];
    return calculateEnhancedConfidence(
      book, 
      llmConfidence, 
      extractionMetadata?.extractionMethod
    );
  });
};

/**
 * Confidence threshold definitions
 */
export const CONFIDENCE_THRESHOLDS = {
  EXCELLENT: 0.9,
  GOOD: 0.7,
  MODERATE: 0.5,
  POOR: 0.3,
  VERY_POOR: 0.1
} as const;

/**
 * Get confidence level label
 */
export const getConfidenceLevel = (score: number): string => {
  if (score >= CONFIDENCE_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (score >= CONFIDENCE_THRESHOLDS.GOOD) return 'Good';
  if (score >= CONFIDENCE_THRESHOLDS.MODERATE) return 'Moderate';
  if (score >= CONFIDENCE_THRESHOLDS.POOR) return 'Poor';
  return 'Very Poor';
};

/**
 * Filter books by confidence threshold
 */
export const filterBooksByConfidence = (
  books: Book[],
  minConfidence: number = CONFIDENCE_THRESHOLDS.MODERATE
): Book[] => {
  return books.filter(book => {
    const confidence = book.confidence ?? scoreBookConfidence(book);
    return confidence >= minConfidence;
  });
}; 