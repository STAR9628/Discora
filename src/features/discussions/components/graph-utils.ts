import type { DiscussionClaim } from "@/features/discussions/types";

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  relationType: "supports" | "contradicts" | "refines";
}

export interface ClaimRelationCounts {
  outgoingSupports: number;
  incomingSupports: number;
  outgoingContradicts: number;
  incomingContradicts: number;
  outgoingRefines: number;
  incomingRefines: number;
}

export function computeRelationCounts(
  claimIds: Set<string>,
  edges: GraphEdge[],
): Map<string, ClaimRelationCounts> {
  const counts = new Map<string, ClaimRelationCounts>();
  for (const id of claimIds) {
    counts.set(id, {
      outgoingSupports: 0,
      incomingSupports: 0,
      outgoingContradicts: 0,
      incomingContradicts: 0,
      outgoingRefines: 0,
      incomingRefines: 0,
    });
  }
  for (const edge of edges) {
    const source = counts.get(edge.sourceId);
    const target = counts.get(edge.targetId);
    if (!source || !target) continue;
    switch (edge.relationType) {
      case "supports":
        source.outgoingSupports++;
        target.incomingSupports++;
        break;
      case "contradicts":
        source.outgoingContradicts++;
        target.incomingContradicts++;
        break;
      case "refines":
        source.outgoingRefines++;
        target.incomingRefines++;
        break;
    }
  }
  return counts;
}

export function computeTotalOutgoing(counts: ClaimRelationCounts): number {
  return counts.outgoingSupports + counts.outgoingContradicts + counts.outgoingRefines;
}

export function computeTotalIncoming(counts: ClaimRelationCounts): number {
  return counts.incomingSupports + counts.incomingContradicts + counts.incomingRefines;
}

export function computeTotalRelations(counts: ClaimRelationCounts): number {
  return computeTotalOutgoing(counts) + computeTotalIncoming(counts);
}

export function findConnectedComponent(
  startId: string,
  edges: GraphEdge[],
): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.sourceId === current && !visited.has(edge.targetId)) {
        visited.add(edge.targetId);
        queue.push(edge.targetId);
      }
      if (edge.targetId === current && !visited.has(edge.sourceId)) {
        visited.add(edge.sourceId);
        queue.push(edge.sourceId);
      }
    }
  }
  return visited;
}

export function findAllConnectedComponents(
  claimIds: Set<string>,
  edges: GraphEdge[],
): Set<string>[] {
  const remaining = new Set(claimIds);
  const components: Set<string>[] = [];
  for (const id of claimIds) {
    if (!remaining.has(id)) continue;
    const component = findConnectedComponent(id, edges);
    components.push(component);
    for (const cid of component) {
      remaining.delete(cid);
    }
  }
  return components;
}

export function computeImportance(counts: ClaimRelationCounts): number {
  return (
    counts.incomingSupports +
    counts.incomingRefines +
    counts.outgoingSupports +
    counts.outgoingContradicts +
    counts.outgoingRefines
  );
}

export function getDirectRelationColor(
  claimId: string,
  activeClaimId: string | null,
  edges: GraphEdge[],
): string | null {
  if (!activeClaimId || claimId === activeClaimId) return null;
  let hasContradicts = false;
  let hasSupports = false;
  let hasRefines = false;
  for (const edge of edges) {
    const isDirect =
      (edge.sourceId === activeClaimId && edge.targetId === claimId) ||
      (edge.targetId === activeClaimId && edge.sourceId === claimId);
    if (!isDirect) continue;
    switch (edge.relationType) {
      case "contradicts":
        hasContradicts = true;
        break;
      case "supports":
        hasSupports = true;
        break;
      case "refines":
        hasRefines = true;
        break;
    }
  }
  if (hasContradicts) return "contradicts";
  if (hasSupports) return "supports";
  if (hasRefines) return "refines";
  return null;
}

// ─── Phase 8: Root / Leaf / Hub ───────────────────────────────────────

export function getLeafClaims(
  _edges: GraphEdge[],
  counts: Map<string, ClaimRelationCounts>,
): Set<string> {
  const leaves = new Set<string>();
  for (const [id, c] of counts) {
    if (computeTotalIncoming(c) > 0 && computeTotalOutgoing(c) === 0) {
      leaves.add(id);
    }
  }
  return leaves;
}

// ─── Phase 9: Advanced Stats ──────────────────────────────────────────

export interface GraphAdvancedStats {
  mostSupportedClaim: { id: string; count: number } | null;
  mostContradictedClaim: { id: string; count: number } | null;
  mostRefinedClaim: { id: string; count: number } | null;
  highestImportanceClaim: { id: string; score: number } | null;
}

export function computeMostConnectedClaim(
  counts: Map<string, ClaimRelationCounts>,
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const [id, c] of counts) {
    const total =
      c.outgoingSupports + c.incomingSupports +
      c.outgoingContradicts + c.incomingContradicts +
      c.outgoingRefines + c.incomingRefines;
    if (!best || total > best.score) {
      best = { id, score: total };
    }
  }
  return best && best.score > 0 ? best : null;
}

export function computeAdvancedStats(
  counts: Map<string, ClaimRelationCounts>,
  importanceByClaim: Map<string, number>,
): GraphAdvancedStats {
  let mostSupported: { id: string; count: number } | null = null;
  let mostContradicted: { id: string; count: number } | null = null;
  let mostRefined: { id: string; count: number } | null = null;
  let mostImportant: { id: string; score: number } | null = null;

  for (const [id, c] of counts) {
    if (!mostSupported || c.incomingSupports > mostSupported.count) {
      mostSupported = { id, count: c.incomingSupports };
    }
    if (!mostContradicted || c.incomingContradicts > mostContradicted.count) {
      mostContradicted = { id, count: c.incomingContradicts };
    }
    if (!mostRefined || c.incomingRefines > mostRefined.count) {
      mostRefined = { id, count: c.incomingRefines };
    }
  }

  for (const [id, score] of importanceByClaim) {
    if (!mostImportant || score > mostImportant.score) {
      mostImportant = { id, score };
    }
  }

  return {
    mostSupportedClaim: mostSupported && mostSupported.count > 0 ? mostSupported : null,
    mostContradictedClaim: mostContradicted && mostContradicted.count > 0 ? mostContradicted : null,
    mostRefinedClaim: mostRefined && mostRefined.count > 0 ? mostRefined : null,
    highestImportanceClaim: mostImportant && mostImportant.score > 0 ? mostImportant : null,
  };
}

// ─── Phase 10: Reasoning Path ─────────────────────────────────────────

function findAncestors(nodeId: string, edges: GraphEdge[]): Set<string> {
  const ancestors = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.targetId === current && !ancestors.has(edge.sourceId)) {
        ancestors.add(edge.sourceId);
        queue.push(edge.sourceId);
      }
    }
  }
  return ancestors;
}

function findDescendants(nodeId: string, edges: GraphEdge[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.sourceId === current && !descendants.has(edge.targetId)) {
        descendants.add(edge.targetId);
        queue.push(edge.targetId);
      }
    }
  }
  return descendants;
}

export function findReasoningPath(
  sourceId: string,
  targetId: string,
  edges: GraphEdge[],
): Set<string> {
  const ancestors = findAncestors(sourceId, edges);
  const descendants = findDescendants(targetId, edges);
  return new Set([sourceId, targetId, ...ancestors, ...descendants]);
}

export function findReasoningPathEdgeIndices(
  sourceId: string,
  targetId: string,
  edges: GraphEdge[],
): Set<number> {
  const pathIds = findReasoningPath(sourceId, targetId, edges);
  const indices = new Set<number>();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (pathIds.has(e.sourceId) && pathIds.has(e.targetId)) {
      indices.add(i);
    }
  }
  return indices;
}

// ─── Phase 11: Cluster Info ──────────────────────────────────────────

export const CLUSTER_COLORS = [
  "border-blue-500/10 bg-blue-500/[0.015]",
  "border-emerald-500/10 bg-emerald-500/[0.015]",
  "border-amber-500/10 bg-amber-500/[0.015]",
  "border-violet-500/10 bg-violet-500/[0.015]",
  "border-rose-500/10 bg-rose-500/[0.015]",
  "border-cyan-500/10 bg-cyan-500/[0.015]",
  "border-orange-500/10 bg-orange-500/[0.015]",
  "border-purple-500/10 bg-purple-500/[0.015]",
];

export function getClusterIndex(
  claimId: string,
  components: Set<string>[],
): number {
  for (let i = 0; i < components.length; i++) {
    if (components[i].has(claimId)) return i;
  }
  return 0;
}

export interface ClusterSummary {
  connectedClusters: { index: number; size: number; label: string }[];
  isolatedCount: number;
}

export function generateClusterLabel(claimIds: Set<string>, claims: DiscussionClaim[]): string {
  const stopWords = new Set([
    "the", "a", "an", "this", "that", "these", "those", "it", "its", "they", "them",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
    "through", "during", "before", "after", "above", "below", "between",
    "and", "or", "but", "nor", "not", "so", "yet", "both", "either", "neither",
    "about", "against", "between", "without", "within", "across", "around",
    "up", "down", "out", "off", "over", "under", "again", "further", "then",
    "once", "here", "there", "when", "where", "why", "how", "all", "each",
    "every", "both", "few", "more", "most", "other", "some", "such", "no",
    "only", "own", "same", "too", "very", "just", "also", "can", "than",
  ]);

  const wordCount = new Map<string, number>();

  for (const claimId of claimIds) {
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) continue;
    const words = claim.content.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  }

  const sorted = [...wordCount.entries()].sort((a, b) => b[1] - a[1]);
  const topWords = sorted.slice(0, 3).map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  if (topWords.length === 0) return "Unlabeled";
  if (topWords.length === 1) return topWords[0];
  if (topWords.length === 2) return `${topWords[0]} & ${topWords[1]}`;
  return `${topWords[0]}, ${topWords[1]} & ${topWords[2]}`;
}

export function computeClusterSummary(components: Set<string>[], claims: DiscussionClaim[]): ClusterSummary {
  const connectedClusters: { index: number; size: number; label: string }[] = [];
  let isolatedCount = 0;
  for (let i = 0; i < components.length; i++) {
    if (components[i].size > 1) {
      const label = generateClusterLabel(components[i], claims);
      connectedClusters.push({ index: i, size: components[i].size, label });
    } else {
      isolatedCount++;
    }
  }
  return { connectedClusters, isolatedCount };
}

// ─── Phase 12: Hierarchical Depth (V3.5 Rewrite) ──────────────────────

// Depth computation uses DFS with cycle-safe visiting.
//
// DAG behavior:
//   Seeds (in-degree 0) propagate depth forward via BFS.
//   Each child receives depth = max(current, parentDepth + 1).
//   All nodes reachable from a seed are assigned a depth.
//
// Cycle behavior:
//   A per-seed visited set (onPath) prevents re-entering a node
//   already processed in the current propagation wave. The back-edge
//   is silently ignored — the cycle participant keeps whatever depth
//   it was assigned via the acyclic path that entered the cycle.
//
//   Purely cyclic components (no true seed) stay at depth 0.
//
// Disconnected component behavior:
//   Each component with a seed is processed independently. Components
//   without seeds (isolated nodes, pure cycles) remain at depth 0.
//
// Depth semantics (Phase 2):
//   Only support and refine edges contribute to depth.
//   Contradiction edges do NOT deepen the graph — they are side
//   branches at the same depth as their target.
//
export function computeGraphDepths(
  claimIds: Set<string>,
  edges: GraphEdge[],
): Map<string, number> {
  const depths = new Map<string, number>();
  for (const id of claimIds) depths.set(id, 0);

  // Phase 2: Only support/refine edges deepen the graph
  const depthEdges = edges.filter((e) => e.relationType !== "contradicts");

  // Build adjacency list from depth-relevant edges
  const adj = new Map<string, string[]>();
  for (const id of claimIds) adj.set(id, []);
  for (const edge of depthEdges) {
    if (claimIds.has(edge.sourceId) && claimIds.has(edge.targetId)) {
      adj.get(edge.sourceId)!.push(edge.targetId);
    }
  }

  // Compute incoming degree for depth-relevant edges only
  const inDegree = new Map<string, number>();
  for (const id of claimIds) inDegree.set(id, 0);
  for (const edge of depthEdges) {
    if (claimIds.has(edge.targetId)) {
      inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
    }
  }

  // Seeds are nodes with in-degree 0 (no incoming support/refine edges)
  const seeds: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) seeds.push(id);
  }

  // Propagate depth from each seed.
  // onPath tracks the current BFS wave to detect cycles.
  const onPath = new Set<string>();

  for (const seed of seeds) {
    onPath.clear();
    const queue: Array<{ id: string; depth: number }> = [
      { id: seed, depth: 0 },
    ];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      onPath.add(id);

      for (const child of adj.get(id) || []) {
        // Cycle prevention: skip if already visited in this wave
        if (onPath.has(child)) continue;

        const candidateDepth = depth + 1;
        if (candidateDepth > (depths.get(child) || 0)) {
          depths.set(child, candidateDepth);
          queue.push({ id: child, depth: candidateDepth });
        }
      }
    }
  }

  return depths;
}

export function computeMaxDepth(depths: Map<string, number>): number {
  let max = 0;
  for (const d of depths.values()) {
    if (d > max) max = d;
  }
  return max;
}

// ─── Phase 3: Component-Aware Root Detection ──────────────────────────

// Roots are computed per connected component.
//
// Rules:
//   1. One root per component.
//   2. Prefer the claim with the lowest incoming degree
//      (only support/refine edges count — contradictions don't
//       make a claim "supported into").
//   3. Tie-break: highest outgoing support/refine degree.
//   4. Cyclic components: the algorithm still selects the node
//      with the fewest incoming depth edges (which may be all equal
//      in a symmetric cycle, in which case the first candidate wins).
//   5. Isolated claims (singleton components with no edges) are
//      returned as roots — they are the sole member of their component.
//
export function getComponentRoots(
  components: Set<string>[],
  edges: GraphEdge[],
  counts: Map<string, ClaimRelationCounts>,
): Set<string> {
  const roots = new Set<string>();

  // Only support/refine edges determine argument roots
  const depthEdges = edges.filter((e) => e.relationType !== "contradicts");

  for (const component of components) {
    if (component.size === 0) continue;

    // Compute in-degree within the component (support/refine only)
    const inDegree = new Map<string, number>();
    for (const id of component) inDegree.set(id, 0);
    for (const edge of depthEdges) {
      if (component.has(edge.targetId)) {
        inDegree.set(edge.targetId, (inDegree.get(edge.targetId) || 0) + 1);
      }
    }

    // Find minimum incoming degree
    let minDeg = Infinity;
    for (const deg of inDegree.values()) {
      if (deg < minDeg) minDeg = deg;
    }

    // Collect candidates with minimum incoming degree
    const candidates: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === minDeg) candidates.push(id);
    }

    // Single candidate → unambiguous root
    if (candidates.length === 1) {
      roots.add(candidates[0]);
      continue;
    }

    // Tie-break: highest outgoing support/refine degree wins
    let bestId = candidates[0];
    let bestOut = -1;
    for (const id of candidates) {
      const c = counts.get(id);
      if (!c) continue;
      const outDeg = c.outgoingSupports + c.outgoingRefines;
      if (outDeg > bestOut) {
        bestOut = outDeg;
        bestId = id;
      }
    }
    roots.add(bestId);
  }

  return roots;
}

// ─── Phase 4: Weighted Hub Scoring ────────────────────────────────────

// Hubs are claims with high connectivity, weighted to favour
// genuine reasoning centrality over controversy.
//
// Weights:
//   incomingSupports   × 3   — strong signal: others actively support this
//   incomingRefines    × 2   — moderate signal: others refine this
//   outgoingSupports   × 2   — moderate signal: this claim supports others
//   outgoingRefines    × 1.5 — weak signal: this claim refines others
//   outgoingContradicts × 0.5 — weak negative: contradicting doesn't make a hub
//   incomingContradicts × 0.3 — very weak: being contradicted is anti-hub
//
export function computeHubScore(counts: ClaimRelationCounts): number {
  return (
    counts.incomingSupports * 3 +
    counts.incomingRefines * 2 +
    counts.outgoingSupports * 2 +
    counts.outgoingRefines * 1.5 +
    counts.outgoingContradicts * 0.5 +
    counts.incomingContradicts * 0.3
  );
}

export function getHubClaims(
  counts: Map<string, ClaimRelationCounts>,
  maxCount: number,
): Set<string> {
  const scored: Array<{ id: string; score: number }> = [];
  for (const [id, c] of counts) {
    scored.push({ id, score: computeHubScore(c) });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(maxCount, scored.length));
  const threshold = top.length > 0 ? top[top.length - 1].score : 0;
  return new Set(
    scored
      .filter((s) => s.score >= threshold && s.score > 0)
      .slice(0, Math.min(maxCount, scored.length))
      .map((s) => s.id),
  );
}

// ─── Phase 6: Audit Utilities (Development Only) ──────────────────────

// These functions validate graph invariants without side effects.
// They are available for testing and debugging but never called
// in the rendering pipeline.

export interface DepthValidation {
  valid: boolean;
  maxDepth: number;
  issues: string[];
}

export function validateDepths(
  depths: Map<string, number>,
  claimCount: number,
): DepthValidation {
  const issues: string[] = [];
  let maxDepth = 0;
  for (const d of depths.values()) {
    if (d > maxDepth) maxDepth = d;
  }
  if (maxDepth >= claimCount && claimCount > 0) {
    issues.push(
      `Max depth ${maxDepth} >= node count ${claimCount} — possible cycle inflation`,
    );
  }
  return { valid: issues.length === 0, maxDepth, issues };
}

export function validateRoots(
  roots: Set<string>,
  components: Set<string>[],
  claimCount: number,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (components.length > 0 && roots.size === 0 && claimCount > 0) {
    issues.push("No roots found despite having components — all claims may be in cycles");
  }
  if (roots.size > components.length && claimCount > 0) {
    issues.push(
      `More roots (${roots.size}) than components (${components.length}) — unexpected`,
    );
  }
  return { valid: issues.length === 0, issues };
}

export function validateHubs(
  hubs: Set<string>,
  counts: Map<string, ClaimRelationCounts>,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const id of hubs) {
    if (!counts.has(id)) {
      issues.push(`Hub "${id}" not found in counts`);
    }
  }
  return { valid: issues.length === 0, issues };
}
