"use client";

import { useMemo, useRef, useState, useLayoutEffect, useCallback, useEffect, memo } from "react";
import type {
  DiscussionClaim,
  DiscussionClaimRelation,
  DiscussionQuestion,
  ClaimContextType,
} from "@/features/discussions/types";
import {
  FileText,
  Eye,
  Search,
  Lightbulb,
  BarChart3,
  HelpCircle,
  Plus,
  Minus,
  Sparkles,
  Maximize2,
  Minimize2,
  Layers,
  List,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  computeRelationCounts,
  findConnectedComponent,
  findAllConnectedComponents,
  computeImportance,
  getDirectRelationColor,
  getComponentRoots,
  getLeafClaims,
  getHubClaims,
  computeAdvancedStats,
  computeGraphDepths,
  findReasoningPath,
  findReasoningPathEdgeIndices,
  getClusterIndex,
  CLUSTER_COLORS,
  computeClusterSummary,
  computeTotalRelations,
} from "./graph-utils";
import type { GraphEdge, ClaimRelationCounts } from "./graph-utils";

interface GraphViewProps {
  claims: DiscussionClaim[];
  claimRelations: DiscussionClaimRelation[];
  questions: DiscussionQuestion[];
  selectedClaimId?: string | null;
  onNodeClick?: (claimId: string) => void;
  evidenceCountByClaim?: Record<string, number>;
  claimContentMap?: Map<string, string>;
  searchQuery?: string;
}

const EDGE_COLORS: Record<string, string> = {
  supports: "#22c55e",
  contradicts: "#f43f5e",
  refines: "#8b5cf6",
};

const EDGE_LABELS: Record<string, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  refines: "Refines",
};

function getClaimTypeIcon(type: string) {
  switch (type) {
    case "fact": return <FileText className="h-3 w-3" />;
    case "opinion": return <Eye className="h-3 w-3" />;
    case "prediction": return <Search className="h-3 w-3" />;
    case "proposal": return <Lightbulb className="h-3 w-3" />;
    case "observation": return <BarChart3 className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
}

function getContextIcon(type: ClaimContextType) {
  switch (type) {
    case "supporting_idea": return <Plus className="h-3 w-3" />;
    case "counterpoint": return <Minus className="h-3 w-3" />;
    case "observation": return <Sparkles className="h-3 w-3" />;
    case "open_question": return <HelpCircle className="h-3 w-3" />;
  }
}

function getContextColor(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea": return "text-emerald-400";
    case "counterpoint": return "text-violet-400";
    case "observation": return "text-sky-400";
    case "open_question": return "text-amber-400";
  }
}

function getContextLabel(type: ClaimContextType): string {
  switch (type) {
    case "supporting_idea": return "Supporting Ideas";
    case "counterpoint": return "Counterpoints";
    case "observation": return "Observations";
    case "open_question": return "Open Questions";
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "\u2026";
}

function CompactClaimCard({
  claim,
  relationCounts,
  directRelationColor,
  importanceScore,
  evidenceCount,
  isActive,
  isInFocus,
  hasAnyRelation,
  isSearchMatch,
  isRoot,
  isLeaf,
  isHub,
  onClick,
  onViewInList,
  innerRef,
}: {
  claim: DiscussionClaim;
  relationCounts: ClaimRelationCounts;
  directRelationColor: string | null;
  importanceScore: number;
  evidenceCount: number;
  isActive: boolean;
  isInFocus: boolean;
  hasAnyRelation: boolean;
  isSearchMatch: boolean;
  isRoot: boolean;
  isLeaf: boolean;
  isHub: boolean;
  onClick: () => void;
  onViewInList?: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
}) {
  let borderColor = "border-l-border";
  if (isActive) {
    borderColor = "border-l-blue-400";
  } else if (directRelationColor === "contradicts") {
    borderColor = "border-l-red-500";
  } else if (directRelationColor === "supports") {
    borderColor = "border-l-green-500";
  } else if (directRelationColor === "refines") {
    borderColor = "border-l-purple-500";
  } else {
    switch (claim.contextType) {
      case "supporting_idea": borderColor = "border-l-emerald-500/50"; break;
      case "counterpoint": borderColor = "border-l-violet-500/50"; break;
      case "observation": borderColor = "border-l-sky-500/50"; break;
      case "open_question": borderColor = "border-l-amber-500/50"; break;
    }
  }

  const cardOpacity = isSearchMatch ? "opacity-100" : (!hasAnyRelation || isInFocus ? "opacity-100" : "opacity-20");
  const scale = Math.min(1 + importanceScore * 0.015, 1.06);

  return (
    <div
      ref={innerRef}
      onClick={onClick}
      className={`
        relative         rounded-lg border border-border/60 bg-card/20 p-3
        border-l-4 ${borderColor} cursor-pointer transition-all duration-200
        hover:border-foreground/20 hover:bg-card/40 select-none
        ${cardOpacity}
        ${isActive ? "ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/10" : ""}
        ${isInFocus && !isActive && directRelationColor ? "ring-1 ring-foreground/20" : ""}
        ${!isSearchMatch ? "grayscale-[60%]" : ""}
      `}
      style={{ width: "240px", transform: `scale(${scale})`, transformOrigin: "center left" }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold">
          {getClaimTypeIcon(claim.claimType)}
          <span className="capitalize">{claim.claimType}</span>
        </span>
        <span className="ml-auto text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          {getContextIcon(claim.contextType)}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-1 flex-wrap">
        {isRoot && (
          <span className="inline-flex items-center rounded bg-blue-500/10 px-1 py-[1px] text-[7px] font-semibold uppercase tracking-wider text-blue-400/80">Root</span>
        )}
        {isLeaf && (
          <span className="inline-flex items-center rounded bg-emerald-500/10 px-1 py-[1px] text-[7px] font-semibold uppercase tracking-wider text-emerald-400/80">Leaf</span>
        )}
        {isHub && (
          <span className="inline-flex items-center rounded bg-amber-500/10 px-1 py-[1px] text-[7px] font-semibold uppercase tracking-wider text-amber-400/80">Hub</span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-foreground/85 line-clamp-3">
        {truncate(claim.content, 140)}
      </p>
      <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
        <span>{claim.agreeCount ?? 0} agree</span>
        <span>{claim.disagreeCount ?? 0} disagree</span>
      </div>

      {evidenceCount > 0 && (
        <div className="flex items-center gap-1 mt-1 text-[8px] text-muted-foreground">
          <FileText className="h-2.5 w-2.5" />
          <span>Evidence: {evidenceCount}</span>
        </div>
      )}

      {hasAnyRelation && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {relationCounts.outgoingSupports > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/15 bg-emerald-500/5 px-1 py-[1px] text-[8px] leading-none text-emerald-400/80">
              {"\u2191"} {relationCounts.outgoingSupports}
            </span>
          )}
          {relationCounts.incomingSupports > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/15 bg-emerald-500/5 px-1 py-[1px] text-[8px] leading-none text-emerald-400/60">
              {"\u2193"} {relationCounts.incomingSupports}
            </span>
          )}
          {relationCounts.outgoingContradicts > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-rose-500/15 bg-rose-500/5 px-1 py-[1px] text-[8px] leading-none text-rose-400/80">
              {"\u00d7"} {relationCounts.outgoingContradicts}
            </span>
          )}
          {relationCounts.incomingContradicts > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-rose-500/15 bg-rose-500/5 px-1 py-[1px] text-[8px] leading-none text-rose-400/60">
              {"\u00d7\u2190"} {relationCounts.incomingContradicts}
            </span>
          )}
          {relationCounts.outgoingRefines > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-violet-500/15 bg-violet-500/5 px-1 py-[1px] text-[8px] leading-none text-violet-400/80">
              {"\u21ba"} {relationCounts.outgoingRefines}
            </span>
          )}
          {relationCounts.incomingRefines > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded border border-violet-500/15 bg-violet-500/5 px-1 py-[1px] text-[8px] leading-none text-violet-400/60">
              {"\u21ba\u2190"} {relationCounts.incomingRefines}
            </span>
          )}
        </div>
      )}

      {onViewInList && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewInList(); }}
          className="mt-1.5 flex items-center gap-1 rounded border border-border/40 bg-background/30 px-1.5 py-0.5 text-[7px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors w-full justify-center"
        >
          <List className="h-2.5 w-2.5" />
          View in List
        </button>
      )}
    </div>
  );
}

function buildEdgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.min(Math.abs(x2 - x1) * 0.5, 100);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

interface GraphEdgesLayerProps {
  filteredEdges: GraphEdge[];
  positions: Map<string, DOMRect>;
  activeClaimId: string | null;
  connectedIds: Set<string>;
  hoveredEdgeIndex: number | null;
  hoveredPathEdgeIndices: Set<number>;
  focusMode: boolean;
  onHoverEdge: (index: number | null) => void;
}

const GraphEdgesLayer = memo(function GraphEdgesLayer({
  filteredEdges,
  positions,
  activeClaimId,
  connectedIds,
  hoveredEdgeIndex,
  hoveredPathEdgeIndices,
  focusMode,
  onHoverEdge,
}: GraphEdgesLayerProps) {
  if (filteredEdges.length === 0 || positions.size <= 1) return null;

  return (
    <svg className="absolute inset-0" width="100%" height="100%" style={{ overflow: "visible", zIndex: 0 }}>
      <defs>
        {(["supports", "contradicts", "refines"] as const).map((type) => (
          <marker key={type} id={`graph-arrow-${type}`} markerWidth="28" markerHeight="22" refX="26" refY="11" orient="auto">
            <polygon points="0 0, 28 11, 0 22" fill={EDGE_COLORS[type]} />
          </marker>
        ))}
        {(["supports", "contradicts", "refines"] as const).map((type) => (
          <marker key={`${type}-dim`} id={`graph-arrow-${type}-dim`} markerWidth="28" markerHeight="22" refX="26" refY="11" orient="auto">
            <polygon points="0 0, 28 11, 0 22" fill={EDGE_COLORS[type]} opacity={0.1} />
          </marker>
        ))}
        {(["supports", "contradicts", "refines"] as const).map((type) => (
          <marker key={`${type}-incoming`} id={`graph-arrow-${type}-incoming`} markerWidth="28" markerHeight="22" refX="2" refY="11" orient="auto">
            <polygon points="28 0, 0 11, 28 22" fill={EDGE_COLORS[type]} />
          </marker>
        ))}
      </defs>
      {filteredEdges.map((edge, i) => {
        const sourcePos = positions.get(edge.sourceId);
        const targetPos = positions.get(edge.targetId);
        if (!sourcePos || !targetPos) return null;

        const x1 = sourcePos.left + sourcePos.width;
        const y1 = sourcePos.top + sourcePos.height / 2;
        const x2 = targetPos.left;
        const y2 = targetPos.top + targetPos.height / 2;

        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;

        const isSourceActive = edge.sourceId === activeClaimId;
        const isTargetActive = edge.targetId === activeClaimId;
        const isConnectedPair = activeClaimId !== null && connectedIds.has(edge.sourceId) && connectedIds.has(edge.targetId);
        const isActiveEdge = isSourceActive || isTargetActive;
        const isHovered = hoveredEdgeIndex === i;
        const isInHoveredPath = hoveredPathEdgeIndices.has(i);

        let strokeWidth = 4;
        let strokeOpacity = 0.5;
        let markerSuffix = "";
        let isDashed = false;
        let labelPrefix = "";
        let labelSuffix = "";

        if (focusMode && activeClaimId !== null) {
          if (isActiveEdge) {
            strokeWidth = 6;
            strokeOpacity = 0.95;
          } else {
            strokeWidth = 0.5;
            strokeOpacity = 0.04;
            markerSuffix = "-dim";
          }
        } else if (activeClaimId === null && hoveredEdgeIndex === null) {
          strokeWidth = 4;
          strokeOpacity = 0.35;
        } else if (hoveredEdgeIndex !== null) {
          if (isInHoveredPath) {
            strokeWidth = isHovered ? 7 : 5;
            strokeOpacity = isHovered ? 0.95 : 0.65;
            if (isHovered) labelSuffix = " \u2192";
          } else if (isHovered) {
            strokeWidth = 7;
            strokeOpacity = 0.9;
            labelSuffix = " \u2192";
          } else {
            strokeWidth = 1.5;
            strokeOpacity = 0.06;
            markerSuffix = "-dim";
          }
        } else if (isSourceActive) {
          strokeWidth = isHovered ? 7 : 5.5;
          strokeOpacity = 0.9;
          labelSuffix = " \u2192";
        } else if (isTargetActive) {
          strokeWidth = isHovered ? 7 : 5.5;
          strokeOpacity = 0.85;
          isDashed = true;
          markerSuffix = "-incoming";
          labelPrefix = "\u2190 ";
        } else if (isConnectedPair) {
          strokeWidth = 2;
          strokeOpacity = 0.25;
          markerSuffix = "-dim";
        } else {
          strokeWidth = 1.5;
          strokeOpacity = 0.06;
          markerSuffix = "-dim";
        }

        const color = EDGE_COLORS[edge.relationType];
        const pathDef = buildEdgePath(x1, y1, x2, y2);
        const labelText = `${labelPrefix}${EDGE_LABELS[edge.relationType]}${labelSuffix}`;
        const labelWidth = labelText.length * 8 + 14;

        const labelY = my - 14;

        return (
          <g key={i}>
            <path d={pathDef} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseEnter={() => onHoverEdge(i)} onMouseLeave={() => onHoverEdge(null)} />
            <path d={pathDef} fill="none" stroke={color} strokeWidth={strokeWidth} strokeOpacity={strokeOpacity}
              strokeDasharray={isDashed ? "6,4" : "none"} markerEnd={`url(#graph-arrow-${edge.relationType}${markerSuffix})`}
              style={{ transition: "stroke-width 0.15s ease, stroke-opacity 0.15s ease" }} />
            {isHovered && (
              <>
                <path d={pathDef} fill="none" stroke={color} strokeWidth={strokeWidth + 12} strokeOpacity={0.3}
                  style={{ filter: "blur(5px)" }} />
                <path d={pathDef} fill="none" stroke={color} strokeWidth={strokeWidth + 6} strokeOpacity={0.45}
                  style={{ filter: "blur(2px)" }} />
              </>
            )}
            <g>
              <rect x={mx - labelWidth / 2} y={labelY - 9} width={labelWidth} height={18} rx={9} fill={color}
                fillOpacity={hoveredEdgeIndex !== null ? (isInHoveredPath ? 0.92 : 0.12) : activeClaimId === null ? 0.88 : isActiveEdge ? 0.92 : isConnectedPair ? 0.4 : 0.15} />
              <text x={mx} y={labelY + 5} textAnchor="middle" fill="white" fontSize="9" fontWeight="800"
                opacity={hoveredEdgeIndex !== null ? (isInHoveredPath ? 1 : 0.08) : activeClaimId === null ? 1 : isActiveEdge ? 1 : isConnectedPair ? 0.55 : 0.15}>
                {labelText}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
});

export const GraphView = memo(function GraphView({
  claims,
  claimRelations,
  questions,
  selectedClaimId: externalSelectedId,
  onNodeClick,
  evidenceCountByClaim,
  searchQuery = "",
}: GraphViewProps) {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [hoveredEdgeIndex, setHoveredEdgeIndex] = useState<number | null>(null);
  const [relationFilter, setRelationFilter] = useState<"all" | "supports" | "contradicts" | "refines">("all");
  const [focusMode, setFocusMode] = useState(false);
  const [focusedClusterIndex, setFocusedClusterIndex] = useState<number | null>(null);
  const [expandHops, setExpandHops] = useState<0 | 1 | 2>(0);
  const [collapsedClusters, setCollapsedClusters] = useState<Set<number>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [positions, setPositions] = useState<Map<string, DOMRect>>(new Map());

  useEffect(() => {
    if (externalSelectedId !== undefined && externalSelectedId !== null) {
      setActiveClaimId(externalSelectedId);
    }
  }, [externalSelectedId]);

  const edges = useMemo<GraphEdge[]>(() => {
    return claimRelations.map((rel) => ({
      sourceId: rel.sourceClaimId,
      targetId: rel.targetClaimId,
      relationType: rel.relationType,
    }));
  }, [claimRelations]);

  const claimIdSet = useMemo(() => new Set(claims.map((c) => c.id)), [claims]);

  const visibleEdges = useMemo(
    () => edges.filter((e) => claimIdSet.has(e.sourceId) && claimIdSet.has(e.targetId)),
    [edges, claimIdSet],
  );

  const filteredEdges = useMemo(
    () => relationFilter === "all" ? visibleEdges : visibleEdges.filter((e) => e.relationType === relationFilter),
    [visibleEdges, relationFilter],
  );

  const relationCountsByClaim = useMemo(
    () => computeRelationCounts(claimIdSet, filteredEdges),
    [claimIdSet, filteredEdges],
  );

  const importanceByClaim = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, counts] of relationCountsByClaim) {
      map.set(id, computeImportance(counts));
    }
    return map;
  }, [relationCountsByClaim]);

  const connectedIds = useMemo(() => {
    if (!activeClaimId) return new Set<string>();
    return findConnectedComponent(activeClaimId, filteredEdges);
  }, [activeClaimId, filteredEdges]);

  const directNeighborIds = useMemo(() => {
    if (!activeClaimId) return new Set<string>();
    const neighbors = new Set<string>([activeClaimId]);
    for (const edge of filteredEdges) {
      if (edge.sourceId === activeClaimId) neighbors.add(edge.targetId);
      if (edge.targetId === activeClaimId) neighbors.add(edge.sourceId);
    }
    return neighbors;
  }, [activeClaimId, filteredEdges]);

  const twoHopIds = useMemo(() => {
    if (!activeClaimId) return new Set<string>();
    const result = new Set(directNeighborIds);
    const frontier = new Set(directNeighborIds);
    frontier.delete(activeClaimId);
    for (const fid of frontier) {
      for (const edge of filteredEdges) {
        if (edge.sourceId === fid && !result.has(edge.targetId) && claimIdSet.has(edge.targetId)) {
          result.add(edge.targetId);
        }
        if (edge.targetId === fid && !result.has(edge.sourceId) && claimIdSet.has(edge.sourceId)) {
          result.add(edge.sourceId);
        }
      }
    }
    return result;
  }, [activeClaimId, directNeighborIds, filteredEdges, claimIdSet]);

  const hasAnyRelation = useMemo(() => filteredEdges.length > 0, [filteredEdges]);

  const graphComponents = useMemo(
    () => findAllConnectedComponents(claimIdSet, filteredEdges),
    [claimIdSet, filteredEdges],
  );

  const clusterSummary = useMemo(
    () => computeClusterSummary(graphComponents, claims),
    [graphComponents, claims],
  );

  const claimDepths = useMemo(
    () => computeGraphDepths(claimIdSet, filteredEdges),
    [claimIdSet, filteredEdges],
  );

  const graphStats = useMemo(() => {
    const typeCounts = { supports: 0, contradicts: 0, refines: 0 };
    for (const e of visibleEdges) typeCounts[e.relationType]++;
    const totalPossibleEdges = claims.length * (claims.length - 1) / 2;
    const actualEdges = visibleEdges.length;
    const density = totalPossibleEdges > 0 ? actualEdges / totalPossibleEdges : 0;
    const avgRelations = claims.length > 0 ? actualEdges / claims.length : 0;
    const totalEvidence = evidenceCountByClaim ? Object.keys(evidenceCountByClaim).length : 0;
    const avgEvidence = claims.length > 0 ? totalEvidence / claims.length : 0;

    let maxPathLen = 0;
    for (const d of claimDepths.values()) {
      if (d > maxPathLen) maxPathLen = d;
    }

    let mostCentral: string | null = null;
    let highestTotal = -1;
    for (const [id, c] of relationCountsByClaim) {
      const total = computeTotalRelations(c);
      if (total > highestTotal) {
        highestTotal = total;
        mostCentral = id;
      }
    }

    let strongestContradictionLen = 0;
    const contraEdges = filteredEdges.filter((e) => e.relationType === "contradicts");
    if (contraEdges.length > 0) {
      for (const [id] of relationCountsByClaim) {
        const depth = claimDepths.get(id) ?? 0;
        const contraDepth = contraEdges.some((e) => e.sourceId === id || e.targetId === id) ? depth : 0;
        if (contraDepth > strongestContradictionLen) strongestContradictionLen = contraDepth;
      }
    }

    return {
      claimCount: claims.length,
      questionCount: questions?.length || 0,
      relationCount: visibleEdges.length,
      supportsCount: typeCounts.supports,
      contradictsCount: typeCounts.contradicts,
      refinesCount: typeCounts.refines,
      connectedComponents: graphComponents.length,
      density,
      avgRelations: parseFloat(avgRelations.toFixed(2)),
      avgEvidence: parseFloat(avgEvidence.toFixed(2)),
      mostCentralClaim: mostCentral,
      longestReasoningPath: maxPathLen,
      strongestContradictionChain: strongestContradictionLen,
    };
  }, [claims, questions, visibleEdges, graphComponents, evidenceCountByClaim, claimDepths, filteredEdges, relationCountsByClaim]);

  const rootIds = useMemo(
    () => getComponentRoots(graphComponents, filteredEdges, relationCountsByClaim),
    [graphComponents, filteredEdges, relationCountsByClaim],
  );
  const leafIds = useMemo(
    () => getLeafClaims(filteredEdges, relationCountsByClaim),
    [filteredEdges, relationCountsByClaim],
  );
  const hubIds = useMemo(
    () => getHubClaims(relationCountsByClaim, 3),
    [relationCountsByClaim],
  );

  const advancedStats = useMemo(
    () => computeAdvancedStats(relationCountsByClaim, importanceByClaim),
    [relationCountsByClaim, importanceByClaim],
  );

  const hoveredPathIds = useMemo(() => {
    if (hoveredEdgeIndex === null || hoveredEdgeIndex >= filteredEdges.length) return new Set<string>();
    const edge = filteredEdges[hoveredEdgeIndex];
    return findReasoningPath(edge.sourceId, edge.targetId, filteredEdges);
  }, [hoveredEdgeIndex, filteredEdges]);

  const hoveredPathEdgeIndices = useMemo(() => {
    if (hoveredEdgeIndex === null || hoveredEdgeIndex >= filteredEdges.length) return new Set<number>();
    const edge = filteredEdges[hoveredEdgeIndex];
    return findReasoningPathEdgeIndices(edge.sourceId, edge.targetId, filteredEdges);
  }, [hoveredEdgeIndex, filteredEdges]);

  const searchMatchingIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const matching = new Set<string>();
    for (const c of claims) {
      if (c.content.toLowerCase().includes(q)) matching.add(c.id);
    }
    if (questions) {
      for (const qq of questions) {
        if (qq.content.toLowerCase().includes(q)) {
          const related = claims.filter((c) => c.questionId === qq.id);
          for (const c of related) matching.add(c.id);
        }
      }
    }
    return matching.size > 0 ? matching : new Set<string>();
  }, [searchQuery, claims, questions]);

  const isInFocus = useCallback(
    (claimId: string): boolean => {
      if (searchMatchingIds !== null) return searchMatchingIds.has(claimId);
      if (focusMode && activeClaimId !== null) {
        if (expandHops === 0) return directNeighborIds.has(claimId);
        if (expandHops === 1) return directNeighborIds.has(claimId);
        if (expandHops === 2) return twoHopIds.has(claimId);
        return false;
      }
      if (!hasAnyRelation) return true;
      if (hoveredEdgeIndex !== null) return hoveredPathIds.has(claimId);
      if (activeClaimId !== null) return connectedIds.has(claimId);
      return true;
    },
    [hasAnyRelation, hoveredEdgeIndex, hoveredPathIds, activeClaimId, connectedIds, focusMode, directNeighborIds, searchMatchingIds, expandHops, twoHopIds],
  );

  const isSearchMatch = useCallback(
    (claimId: string): boolean => {
      if (searchMatchingIds === null) return true;
      return searchMatchingIds.has(claimId);
    },
    [searchMatchingIds],
  );

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      newPositions.set(id, new DOMRect(
        rect.left - containerRect.left,
        rect.top - containerRect.top,
        rect.width,
        rect.height,
      ));
    });
    setPositions(newPositions);
  }, []);

  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [measure, claims, filteredEdges]);

  const setCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  const handleClaimClick = useCallback((id: string) => {
    setActiveClaimId((prev) => (prev === id ? null : id));
    onNodeClick?.(id);
  }, [onNodeClick]);

  const handleClaimViewInList = useCallback((id: string) => {
    onNodeClick?.(id);
  }, [onNodeClick]);

  const claimsByQuestion = useMemo(() => {
    const map = new Map<string, DiscussionClaim[]>();
    const orphans: DiscussionClaim[] = [];
    if (!questions) return { byQuestion: map, orphans: claims };
    const questionIds = new Set(questions.map((q) => q.id));
    for (const c of claims) {
      if (c.questionId && questionIds.has(c.questionId)) {
        const list = map.get(c.questionId);
        if (list) list.push(c);
        else map.set(c.questionId, [c]);
      } else {
        orphans.push(c);
      }
    }
    return { byQuestion: map, orphans };
  }, [claims, questions]);

  const clusterSizes = useMemo(() => {
    const allClusters = [...clusterSummary.connectedClusters];
    if (clusterSummary.isolatedCount > 0) {
      allClusters.push({ index: -1, size: clusterSummary.isolatedCount, label: "Isolated" });
    }
    return allClusters;
  }, [clusterSummary]);

  if (claims.length === 0) return null;

  function renderClaimCard(claim: DiscussionClaim) {
    const counts = relationCountsByClaim.get(claim.id) || {
      outgoingSupports: 0, incomingSupports: 0,
      outgoingContradicts: 0, incomingContradicts: 0,
      outgoingRefines: 0, incomingRefines: 0,
    };
    return (
      <CompactClaimCard
        key={claim.id}
        claim={claim}
        relationCounts={counts}
        directRelationColor={getDirectRelationColor(claim.id, activeClaimId, filteredEdges)}
        importanceScore={importanceByClaim.get(claim.id) || 0}
        evidenceCount={evidenceCountByClaim?.[claim.id] || 0}
        isActive={activeClaimId === claim.id}
        isInFocus={isInFocus(claim.id)}
        hasAnyRelation={hasAnyRelation}
        isSearchMatch={isSearchMatch(claim.id)}
        isRoot={rootIds.has(claim.id)}
        isLeaf={leafIds.has(claim.id)}
        isHub={hubIds.has(claim.id)}
        onClick={() => handleClaimClick(claim.id)}
        onViewInList={onNodeClick ? () => handleClaimViewInList(claim.id) : undefined}
        innerRef={(el: HTMLDivElement | null) => setCardRef(claim.id, el)}
      />
    );
  }

  function renderGraphSection(sectionClaims: DiscussionClaim[]) {
    const contextOrder: ClaimContextType[] = ["supporting_idea", "counterpoint", "observation", "open_question"];
    const grouped = new Map<ClaimContextType, DiscussionClaim[]>();
    for (const c of sectionClaims) {
      const list = grouped.get(c.contextType);
      if (list) list.push(c);
      else grouped.set(c.contextType, [c]);
    }
    return (
      <div className="space-y-2">
        {contextOrder.map((type) => {
          const claimsInGroup = grouped.get(type);
          if (!claimsInGroup || claimsInGroup.length === 0) return null;
          return (
            <div key={type} className="space-y-1">
              <div className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${getContextColor(type)}`}>
                {getContextIcon(type)}
                {getContextLabel(type)}
                <span className="text-[10px] font-normal text-muted-foreground">({claimsInGroup.length})</span>
              </div>
              {(() => {
                const byDepth = new Map<number, DiscussionClaim[]>();
                for (const c of claimsInGroup) {
                  const depth = claimDepths.get(c.id) ?? 0;
                  const list = byDepth.get(depth);
                  if (list) list.push(c);
                  else byDepth.set(depth, [c]);
                }
                const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
                return sortedDepths.map((depth) => (
                  <div key={depth} className="flex flex-wrap gap-2">
                    {byDepth.get(depth)!.map((c) => renderClaimCard(c))}
                  </div>
                ));
              })()}
            </div>
          );
        })}
    </div>
  );
}

  return (
    <div className="space-y-4 pt-4">
      {/* Toolbar: Filters + Focus Mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg border border-border/60 bg-card/30 p-0.5">
          {(["all", "supports", "contradicts", "refines"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRelationFilter(type)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors capitalize ${
                relationFilter === type
                  ? "bg-foreground/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "all" ? "All" : type}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFocusMode(!focusMode)}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors ${
            focusMode
              ? "bg-primary/10 border-primary/30 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          {focusMode ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {focusMode ? "Focus Mode" : "Full Graph"}
        </button>
        {focusMode && activeClaimId && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpandHops(0)}
              className={`px-2 py-1 text-[9px] font-medium rounded-md transition-colors ${expandHops === 0 ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              0 hops
            </button>
            <button
              type="button"
              onClick={() => setExpandHops(1)}
              className={`px-2 py-1 text-[9px] font-medium rounded-md transition-colors ${expandHops === 1 ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              1 hop
            </button>
            <button
              type="button"
              onClick={() => setExpandHops(2)}
              className={`px-2 py-1 text-[9px] font-medium rounded-md transition-colors ${expandHops === 2 ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              2 hops
            </button>
          </div>
        )}
      </div>

      {/* Cluster Navigation Panel */}
      {clusterSizes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Layers className="h-3 w-3 text-muted-foreground" />
          {clusterSizes.map((cluster) => (
            <button
              key={cluster.index}
              type="button"
              onClick={() => setFocusedClusterIndex(focusedClusterIndex === cluster.index ? null : cluster.index)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors ${
                focusedClusterIndex === cluster.index
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cluster.label} ({cluster.size})
            </button>
          ))}
          {focusedClusterIndex !== null && (
            <button
              type="button"
              onClick={() => setFocusedClusterIndex(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Graph Analytics Panel */}
      <div className="rounded-lg border border-border/40 bg-card/15 p-2.5">
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">Graph Stats</span>
          <span>Claims: <span className="font-semibold text-foreground/80">{graphStats.claimCount}</span></span>
          <span>Questions: <span className="font-semibold text-foreground/80">{graphStats.questionCount}</span></span>
          <span>Relations: <span className="font-semibold text-foreground/80">{graphStats.relationCount}</span></span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/70" />
            <span className="font-semibold text-foreground/80">{graphStats.supportsCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500/70" />
            <span className="font-semibold text-foreground/80">{graphStats.contradictsCount}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500/70" />
            <span className="font-semibold text-foreground/80">{graphStats.refinesCount}</span>
          </span>
          {graphStats.connectedComponents > 0 && (
            <span>Components: <span className="font-semibold text-foreground/80">{graphStats.connectedComponents}</span></span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
          <span>Density: <span className="font-semibold text-foreground/80">{graphStats.density.toFixed(3)}</span></span>
          <span>Avg Rel/Claim: <span className="font-semibold text-foreground/80">{graphStats.avgRelations}</span></span>
          <span>Avg Evid/Claim: <span className="font-semibold text-foreground/80">{graphStats.avgEvidence}</span></span>
          <span>Max Depth: <span className="font-semibold text-foreground/80">{graphStats.longestReasoningPath}</span></span>
          <span>Contra Chain: <span className="font-semibold text-foreground/80">{graphStats.strongestContradictionChain}</span></span>
        </div>
        {(advancedStats.mostSupportedClaim || advancedStats.mostContradictedClaim || advancedStats.mostRefinedClaim || advancedStats.highestImportanceClaim) && (
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
            {advancedStats.mostSupportedClaim && (
              <span>Most Supported: <span className="font-semibold text-emerald-400/90">{advancedStats.mostSupportedClaim.count}</span></span>
            )}
            {advancedStats.mostContradictedClaim && (
              <span>Most Contradicted: <span className="font-semibold text-rose-400/90">{advancedStats.mostContradictedClaim.count}</span></span>
            )}
            {advancedStats.mostRefinedClaim && (
              <span>Most Refined: <span className="font-semibold text-violet-400/90">{advancedStats.mostRefinedClaim.count}</span></span>
            )}
            {advancedStats.highestImportanceClaim && (
              <span>Highest Importance: <span className="font-semibold text-amber-400/90">{advancedStats.highestImportanceClaim.score}</span></span>
            )}
            {graphStats.mostCentralClaim && (
              <span>Most Central: <span className="font-semibold text-cyan-400/90">{truncate(claims.find((c) => c.id === graphStats.mostCentralClaim)?.content || "", 30)}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Edge Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
        <span className="font-semibold text-foreground/70 uppercase tracking-wider">Legend</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-green-500" />
          <svg width="8" height="6" className="text-green-500"><polygon points="0,0 8,3 0,6" fill="currentColor" /></svg>
          <span className="font-medium text-green-500">Supports</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-rose-500" />
          <svg width="8" height="6" className="text-rose-500"><polygon points="0,0 8,3 0,6" fill="currentColor" /></svg>
          <span className="font-medium text-rose-500">Contradicts</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full bg-violet-500" />
          <svg width="8" height="6" className="text-violet-500"><polygon points="0,0 8,3 0,6" fill="currentColor" /></svg>
          <span className="font-medium text-violet-500">Refines</span>
        </span>
      </div>

      <div ref={containerRef} className="relative">
        <GraphEdgesLayer
          filteredEdges={filteredEdges}
          positions={positions}
          activeClaimId={activeClaimId}
          connectedIds={connectedIds}
          hoveredEdgeIndex={hoveredEdgeIndex}
          hoveredPathEdgeIndices={hoveredPathEdgeIndices}
          focusMode={focusMode}
          onHoverEdge={setHoveredEdgeIndex}
        />

        {/* Cards Layer */}
        <div className="relative" style={{ zIndex: 1 }}>
          {questions && questions.map((q) => {
            const qClaims = claimsByQuestion.byQuestion.get(q.id) || [];
            if (qClaims.length === 0) return null;

            const showQuestion = focusedClusterIndex === null || qClaims.some((c) => getClusterIndex(c.id, graphComponents) === focusedClusterIndex);

            if (!showQuestion) return null;

            const clusterIndexes = [...new Set(qClaims.map((c) => getClusterIndex(c.id, graphComponents)))].filter((ci) => focusedClusterIndex === null || ci === focusedClusterIndex);
            const isCollapsed = collapsedClusters.size > 0 && clusterIndexes.some((ci) => collapsedClusters.has(ci));

            return (
              <div key={q.id} className="mb-4">
                <div className="rounded-xl border border-border/60 bg-card/20 p-2.5 mb-2.5 border-l-4 border-l-sky-500/60">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                      <HelpCircle className="h-3 w-3" />
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 text-[9px] font-semibold capitalize">{q.questionType}</span>
                      <p className="text-xs leading-relaxed text-foreground/90 font-medium mt-1">{q.content}</p>
                    </div>
                  </div>
                </div>
                {isCollapsed ? (
                  <div className="rounded-lg border border-dashed border-border/40 bg-card/10 p-3 text-center text-[10px] text-muted-foreground">
                    Cluster collapsed ({qClaims.length} claims)
                  </div>
                ) : (
                  (() => {
                    const clusters = new Map<number, DiscussionClaim[]>();
                    for (const c of qClaims) {
                      const ci = getClusterIndex(c.id, graphComponents);
                      const list = clusters.get(ci);
                      if (list) list.push(c);
                      else clusters.set(ci, [c]);
                    }
                    if (focusedClusterIndex !== null) {
                      const focusedClaims = clusters.get(focusedClusterIndex) || [];
                      if (focusedClaims.length === 0) return null;
                      return renderGraphSection(focusedClaims);
                    }
                    if (clusters.size <= 1) return renderGraphSection(qClaims);
                    return [...clusters.entries()].map(([ci, clusterClaims]) => {
                      const isClCollapsed = collapsedClusters.has(ci);
                      if (isClCollapsed) {
                        return (
                          <div key={ci} className={`rounded-lg border ${CLUSTER_COLORS[ci % CLUSTER_COLORS.length]} p-3 mb-4`}>
                            <button
                              type="button"
                              onClick={() => { const next = new Set(collapsedClusters); next.delete(ci); setCollapsedClusters(next); }}
                              className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              <ChevronRight className="h-3 w-3" />
                              <span className="font-medium">{`Cluster ${ci + 1}`}</span>
                              <span className="text-muted-foreground/60">({clusterClaims.length} claims)</span>
                            </button>
    </div>
  );
}
                      return (
                        <div key={ci} className={`rounded-lg border ${CLUSTER_COLORS[ci % CLUSTER_COLORS.length]} p-3 mb-4`}>
                          <button
                            type="button"
                            onClick={() => { const next = new Set(collapsedClusters); next.add(ci); setCollapsedClusters(next); }}
                            className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted-foreground hover:text-foreground mb-2"
                          >
                            <ChevronDown className="h-3 w-3" />
                            <span className="font-medium">{`Cluster ${ci + 1}`}</span>
                            <span className="text-muted-foreground/60">({clusterClaims.length} claims)</span>
                          </button>
                          {renderGraphSection(clusterClaims)}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            );
          })}

          {claimsByQuestion.orphans.length > 0 && (
            <div className="space-y-4">
              {questions && questions.length > 0 && (
                <div className="flex items-center justify-center py-1"><div className="h-px w-8 bg-border/40" /></div>
              )}
              {(() => {
                const orphanClusters = new Map<number, DiscussionClaim[]>();
                for (const c of claimsByQuestion.orphans) {
                  const ci = getClusterIndex(c.id, graphComponents);
                  const list = orphanClusters.get(ci);
                  if (list) list.push(c);
                  else orphanClusters.set(ci, [c]);
                }
                if (focusedClusterIndex !== null) {
                  const focusedClaims = orphanClusters.get(focusedClusterIndex) || [];
                  if (focusedClaims.length === 0) return null;
                  return renderGraphSection(focusedClaims);
                }
                if (orphanClusters.size <= 1) return renderGraphSection(claimsByQuestion.orphans);
                return [...orphanClusters.entries()].map(([ci, clusterClaims]) => {
                  const isClCollapsed = collapsedClusters.has(ci);
                  if (isClCollapsed) {
                    return (
                      <div key={ci} className={`rounded-lg border ${CLUSTER_COLORS[ci % CLUSTER_COLORS.length]} p-2 mb-3`}>
                        <button
                          type="button"
                          onClick={() => { const next = new Set(collapsedClusters); next.delete(ci); setCollapsedClusters(next); }}
                          className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span className="font-medium">{`Cluster ${ci + 1}`}</span>
                          <span className="text-muted-foreground/60">({clusterClaims.length} claims)</span>
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div key={ci} className={`rounded-lg border ${CLUSTER_COLORS[ci % CLUSTER_COLORS.length]} p-2 mb-3`}>
                      <button
                        type="button"
                        onClick={() => { const next = new Set(collapsedClusters); next.add(ci); setCollapsedClusters(next); }}
                        className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted-foreground hover:text-foreground mb-2"
                      >
                        <ChevronDown className="h-3 w-3" />
                        <span className="font-medium">{`Cluster ${ci + 1}`}</span>
                        <span className="text-muted-foreground/60">({clusterClaims.length} claims)</span>
                      </button>
                      {renderGraphSection(clusterClaims)}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
