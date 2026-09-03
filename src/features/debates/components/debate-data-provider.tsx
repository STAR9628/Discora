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

export type DebateSection = "overview" | "arguments" | "evidence" | "inquiries" | "contributions";

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
}

const DebateContext = createContext<DebateContextType | undefined>(undefined);

export function DebateDataProvider({
  initialData,
  children,
  initialSection = "overview",
}: {
  initialData: DebateRoomData;
  children: React.ReactNode;
  initialSection?: DebateSection;
}) {
  const { room, topic, debate: initialDebate } = initialData;
  const { user } = useAuth();

  const { data: debateData } = useDebate(room.id);
  const debate = debateData || initialDebate;

  const { data: debateParticipants = [] } = useDebateParticipants(room.id);
  const userParticipation = useMemo(
    () => debateParticipants.find((p) => p.userId === user?.id) || null,
    [debateParticipants, user?.id]
  );

  const [activeSection, setActiveSection] = useState<DebateSection>(initialSection);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedSideFilter, setSelectedSideFilter] = useState<"all" | "proposition" | "opposition">("all");
  const [isSideModalOpen, setIsSideModalOpen] = useState(false);
  const [targetSideToJoin, setTargetSideToJoin] = useState<"proposition" | "opposition" | "neutral" | null>(null);

  const needsClaims = activeSection === "arguments" || activeSection === "contributions";
  const needsQuestions = activeSection === "inquiries";
  const needsEvidence = activeSection === "contributions";
  const { data: claims = [] } = useClaims(room.id, undefined, needsClaims);
  const { data: questions = [] } = useQuestions(room.id, needsQuestions);
  const { data: roomEvidence = [] } = useRoomEvidence(room.id, needsEvidence);
  const { data: inquiries = [] } = useInquiries(room.id, needsQuestions);

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
