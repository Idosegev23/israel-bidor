/**
 * Topic Clustering — Groups US content items by semantic similarity
 * Uses cosine similarity on embeddings stored in pgvector
 */

import { createServerClient } from '@/lib/supabase/server';

// ============================================
// Types
// ============================================

export interface ContentCluster {
  topic: string;
  items: Array<{
    id: string;
    title: string;
    source: string;
    url: string;
  }>;
  sources: string[];
  avgScore: number;
}

// ============================================
// Cosine Similarity (in-memory for small sets)
// ============================================

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ============================================
// Simple Agglomerative Clustering
// ============================================

/**
 * Cluster US content items by embedding similarity
 * Returns groups of related content
 */
export async function clusterUSContent(
  similarityThreshold: number = 0.75,
  windowHours: number = 24
): Promise<ContentCluster[]> {
  const supabase = createServerClient();

  // Get recent items with embeddings
  const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from('us_content_items')
    .select('id, title, source, url, embedding')
    .not('embedding', 'is', null)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !items || items.length === 0) {
    return [];
  }

  console.log(`[Clustering] Processing ${items.length} items`);

  // Parse embeddings
  const itemsWithEmbeddings = items
    .map((item) => ({
      ...item,
      parsedEmbedding: typeof item.embedding === 'string'
        ? JSON.parse(item.embedding)
        : item.embedding,
    }))
    .filter((item) => Array.isArray(item.parsedEmbedding));

  // Simple greedy clustering
  const clusters: ContentCluster[] = [];
  const assigned = new Set<string>();

  for (const item of itemsWithEmbeddings) {
    if (assigned.has(item.id)) continue;

    // Start a new cluster with this item
    const cluster: ContentCluster = {
      topic: item.title,
      items: [{ id: item.id, title: item.title, source: item.source, url: item.url }],
      sources: [item.source],
      avgScore: 0,
    };

    assigned.add(item.id);

    // Find similar items
    for (const other of itemsWithEmbeddings) {
      if (assigned.has(other.id)) continue;

      const similarity = cosineSimilarity(item.parsedEmbedding, other.parsedEmbedding);

      if (similarity >= similarityThreshold) {
        cluster.items.push({
          id: other.id,
          title: other.title,
          source: other.source,
          url: other.url,
        });

        if (!cluster.sources.includes(other.source)) {
          cluster.sources.push(other.source);
        }

        assigned.add(other.id);
      }
    }

    // Only keep clusters with 2+ items
    if (cluster.items.length >= 2) {
      clusters.push(cluster);
    }
  }

  // Sort by number of items (biggest clusters first)
  clusters.sort((a, b) => b.items.length - a.items.length);

  console.log(`[Clustering] Found ${clusters.length} clusters from ${items.length} items`);
  return clusters;
}
