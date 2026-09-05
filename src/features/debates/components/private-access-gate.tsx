"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useJoinWithAccessCode, useAcceptInvitation } from "@/features/debates/hooks/use-debates";
import { toast } from "@/components/ui/toast";
import { Loader2, Lock, KeyRound, Mail, AlertCircle } from "lucide-react";

interface PrivateAccessGateProps {
  roomId: string;
  roomSlug: string;
  initialInvitationToken?: string | null;
  onAccessGranted?: () => void;
}

export function PrivateAccessGate({ roomId, roomSlug, initialInvitationToken, onAccessGranted }: PrivateAccessGateProps) {
  const router = useRouter();
  const { user, status } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [invitationToken, setInvitationToken] = useState(initialInvitationToken || "");
  const [activeTab, setActiveTab] = useState<"code" | "invite">(initialInvitationToken ? "invite" : "code");

  const joinWithCodeMutation = useJoinWithAccessCode();
  const acceptInvitationMutation = useAcceptInvitation();

  // Privacy hardening: scrub the invitation token from the browser address bar
  // immediately after capturing it into state so it is not visible, logged in history,
  // or exposed via shoulder-surfing.
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("invitation=")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("invitation");
      const cleanSearch = url.searchParams.toString();
      window.history.replaceState(
        {},
        "",
        url.pathname + (cleanSearch ? `?${cleanSearch}` : "") + url.hash
      );
    }
  }, []);

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast.error("Please enter an access code.");
      return;
    }
    try {
      await joinWithCodeMutation.mutateAsync({ roomId, code: accessCode.trim() });
      toast.success("Joined debate successfully.");
      onAccessGranted?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join with access code.");
    }
  };

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationToken.trim()) {
      toast.error("Please enter an invitation token.");
      return;
    }
    try {
      await acceptInvitationMutation.mutateAsync({ roomId, invitationToken: invitationToken.trim() });
      toast.success("Invitation accepted. Welcome!");
      onAccessGranted?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation.");
    }
  };

  const isLoading = joinWithCodeMutation.isPending || acceptInvitationMutation.isPending;

  const guestRedirectRef = React.useRef(false);

  React.useEffect(() => {
    if (status === "guest" && !guestRedirectRef.current) {
      guestRedirectRef.current = true;
      const targetPath = initialInvitationToken
        ? `/debates/${roomSlug}?invitation=${encodeURIComponent(initialInvitationToken)}`
        : `/debates/${roomSlug}`;
      router.push(`/login?redirectedFrom=${encodeURIComponent(targetPath)}`);
    }
  }, [status, initialInvitationToken, roomSlug, router]);

  if (status === "guest") {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Private Debate</h2>
          <p className="text-xs text-muted-foreground">Access required</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
        <p className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>This is a private debate. You need an access code or invitation to join.</span>
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/20 p-1 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("code")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "code"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Access Code
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invite")}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "invite"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Invitation
        </button>
      </div>

      {activeTab === "code" && (
        <form onSubmit={handleJoinWithCode} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="accessCode" className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Access Code
            </label>
            <input
              id="accessCode"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter the room access code"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !accessCode.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>Join with Access Code</span>
          </button>
        </form>
      )}

      {activeTab === "invite" && (
        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="invitationToken" className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary" />
              Invitation Token
            </label>
            <input
              id="invitationToken"
              type="text"
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              placeholder="Paste your invitation link or token"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !invitationToken.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span>Accept Invitation</span>
          </button>
        </form>
      )}
    </div>
  );
}
