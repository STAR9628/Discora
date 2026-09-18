"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import type { Room, Debate, DebateParticipant, DiscussionClaim, DiscussionQuestion, DiscussionEvidence } from "@/features/discussions/types";
import type { Topic } from "@/types/domain";
import type { DebateRoomData } from "@/features/debates/services/debate-service";
import type { InquiryItem } from "@/features/debates/types";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDebate, useDebateParticipants } from "@/features/debates/hooks/use-debates";
import { useClaims, useQuestions, useRoomEvidence } from "@/features/discussions/hooks/use-discussions";
import { useInquiries } from "@/features/debates/hooks/use-inquiries";

export type DebateSection =
  | "conversation"
  | "claims"
  | "evidence"
  | "sources"
  | "questions"
  | "understanding"
  | "overview"
  | "arguments"
  | "inquiries"
  | "contributions";

interface DebateContextType {
  room: Room;
  topic: Topic | null;
  debate: Debate;
  userParticipation: DebateParticipant | null;
  allParticipants: DebateParticipant[];
  claims: DiscussionClaim[];
  propositionClaims: DiscussionClaim[];
  oppositionClaims: DiscussionClaim[];
  questions: DiscussionQuestion[];
  roomEvidence: DiscussionEvidence[];
  inquiries: InquiryItem[];
  activeSection: DebateSection;
  setActiveSection: (section: DebateSection) => void;
  selectedClaimId: string | null;
  setSelectedClaimId: (id: string | null) => void;
  selectedSideFilter: "all" | "proposition" | "opposition";
  setSelectedSideFilter: (side: "all" | "proposition" | "opposition") => void;
  isSideModalOpen: boolean;
  setIsSideModalOpen: (open: boolean) => void;
  targetSideToJoin: "proposition" | "opposition" | "neutral" | null;
  setTargetSideToJoin: (side: "proposition" | "opposition" | "neutral" | null) => void;
  slug: string;
}

const DebateContext = createContext<DebateContextType | undefined>(undefined);

export function normalizeDebateLens(section: DebateSection): DebateSection {
  switch (section) {
    case "overview":
    case "contributions":
    case "conversation":
      return "conversation";
    case "arguments":
    case "claims":
      return "claims";
    case "evidence":
      return "evidence";
    case "sources":
      return "sources";
    case "inquiries":
    case "questions":
      return "inquiries";
    case "understanding":
      return "understanding";
    default:
      return "conversation";
  }
}

export interface DebateInitialCollections {
  claims?: DiscussionClaim[];
  questions?: DiscussionQuestion[];
  roomEvidence?: DiscussionEvidence[];
  inquiries?: InquiryItem[];
  participants?: DebateParticipant[];
}

export function DebateDataProvider({
  initialData,
  children,
  initialSection = "conversation",
  initialCollections,
}: {
  initialData: DebateRoomData;
  children: React.ReactNode;
  initialSection?: DebateSection;
  /**
   * Server-rendered first-page collections (public rooms only). Seeds the
   * lens-gated queries below so SSR HTML carries real debate substance;
   * client interactivity continues unchanged. Never pass private-room data.
   */
  initialCollections?: DebateInitialCollections;
}) {
  const { room, topic, debate: initialDebate } = initialData;
  const { user } = useAuth();

  const { data: debateData } = useDebate(room.id);
  const debate = debateData || initialDebate;

  // Guests never request participant-only data: avoids unauthenticated 401
  // noise while preserving identical behavior for signed-in users. No anon
  // grant is introduced; RLS continues to scope authenticated reads.
  const { data: debateParticipants = [] } = useDebateParticipants(room.id, !!user);
  const userParticipation = useMemo(
    () => debateParticipants.find((p) => p.userId === user?.id) || null,
    [debateParticipants, user?.id]
  );

  const [activeSection, setActiveSection] = useState<DebateSection>(normalizeDebateLens(initialSection));
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedSideFilter, setSelectedSideFilter] = useState<"all" | "proposition" | "opposition">("all");
  const [isSideModalOpen, setIsSideModalOpen] = useState(false);
  const [targetSideToJoin, setTargetSideToJoin] = useState<"proposition" | "opposition" | "neutral" | null>(null);

  const currentLens = normalizeDebateLens(activeSection);
  const needsClaims = currentLens === "claims" || currentLens === "conversation" || currentLens === "understanding";
  const needsQuestions = currentLens === "inquiries" || currentLens === "questions" || currentLens === "understanding";
  const needsEvidence = currentLens === "evidence" || currentLens === "sources" || currentLens === "conversation" || currentLens === "understanding";

  const { data: claims = [] } = useClaims(room.id, undefined, needsClaims, initialCollections?.claims);
  const { data: questions = [] } = useQuestions(room.id, needsQuestions, initialCollections?.questions);
  const { data: roomEvidence = [] } = useRoomEvidence(room.id, needsEvidence, initialCollections?.roomEvidence);
  const { data: inquiries = [] } = useInquiries(room.id, needsQuestions, initialCollections?.inquiries);

  const propositionClaims = useMemo(
    () => claims.filter((c) => c.debateSide === "proposition"),
    [claims]
  );

  const oppositionClaims = useMemo(
    () => claims.filter((c) => c.debateSide === "opposition"),
    [claims]
  );

  const value = useMemo(
    () => ({
      room,
      topic,
      debate,
      userParticipation,
      allParticipants: debateParticipants,
      claims,
      propositionClaims,
      oppositionClaims,
      questions,
      roomEvidence,
      inquiries,
      activeSection,
      setActiveSection,
      selectedClaimId,
      setSelectedClaimId,
      selectedSideFilter,
      setSelectedSideFilter,
      isSideModalOpen,
      setIsSideModalOpen,
      targetSideToJoin,
      setTargetSideToJoin,
      slug: room.slug,
    }),
    [
      room,
      topic,
      debate,
      userParticipation,
      debateParticipants,
      claims,
      propositionClaims,
      oppositionClaims,
      questions,
      roomEvidence,
      inquiries,
      activeSection,
      selectedClaimId,
      selectedSideFilter,
      isSideModalOpen,
      targetSideToJoin,
    ]
  );

  return <DebateContext.Provider value={value}>{children}</DebateContext.Provider>;
}

export function useDebateContext() {
  const ctx = useContext(DebateContext);
  if (!ctx) {
    throw new Error("useDebateContext must be used within a DebateDataProvider");
  }
  return ctx;
}
