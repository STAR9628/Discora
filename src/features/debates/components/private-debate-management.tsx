"use client";

import React, { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useDebateContext } from "@/features/debates/components/debate-data-provider";
import { useCreateRoomInvitation, useSetRoomAccessCode, useRemoveDebateParticipant, usePublishDebateRoom, useRoomInvitations, useRevokeRoomInvitation, useSetParticipantInvitesEnabled, type RoomInvitation } from "@/features/debates/hooks/use-debates";
import { toast } from "@/components/ui/toast";
import { Loader2, Copy, Check, UserPlus, Trash2, Send, Users, Lock, Globe, X } from "lucide-react";

export function PrivateDebateManagement() {
  const { user } = useAuth();
  const { room, allParticipants, userParticipation } = useDebateContext();
  const [inviteEmail, setInviteEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [latestInvitationLink, setLatestInvitationLink] = useState<string | null>(null);
  const [copiedInvitation, setCopiedInvitation] = useState(false);

  const createInvitationMutation = useCreateRoomInvitation();
  const setAccessCodeMutation = useSetRoomAccessCode();
  const removeParticipantMutation = useRemoveDebateParticipant();
  const publishMutation = usePublishDebateRoom();
  const { data: invitations = [] } = useRoomInvitations(room.id);
  const revokeInvitationMutation = useRevokeRoomInvitation();
  const setParticipantInvitesEnabledMutation = useSetParticipantInvitesEnabled();

  const isOwner = user?.id === room.createdBy;
  const isActiveParticipant = Boolean(userParticipation && !userParticipation.removedAt);
  const canInvite = isOwner || (isActiveParticipant && room.participantInvitesEnabled);

  if (!isOwner && !canInvite) {
    return null;
  }

  const handleToggleParticipantInvites = async () => {
    try {
      await setParticipantInvitesEnabledMutation.mutateAsync({
        roomId: room.id,
        enabled: !room.participantInvitesEnabled,
      });
      toast.success(room.participantInvitesEnabled ? "Participant invitations disabled." : "Participant invitations enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update setting.");
    }
  };

  const handleSetAccessCode = async () => {
    if (!accessCode.trim()) {
      toast.error("Access code cannot be empty.");
      return;
    }
    try {
      await setAccessCodeMutation.mutateAsync({ roomId: room.id, code: accessCode.trim() });
      toast.success("Access code updated.");
      setShowAccessForm(false);
      setAccessCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set access code.");
    }
  };

  const handleClearAccessCode = async () => {
    try {
      await setAccessCodeMutation.mutateAsync({ roomId: room.id, code: "" });
      toast.success("Access code cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear access code.");
    }
  };

  const handleCreateInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required.");
      return;
    }
    try {
      const result = await createInvitationMutation.mutateAsync({
        roomId: room.id,
        invitedEmail: inviteEmail.trim(),
      });
      const link = `${window.location.origin}/debates/${room.slug}?invitation=${encodeURIComponent(result.invitationToken)}`;
      setLatestInvitationLink(link);
      toast.success("Invitation created.");
      setInviteEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invitation.");
    }
  };

  const handleCopyInvitation = async () => {
    if (latestInvitationLink) {
      await navigator.clipboard.writeText(latestInvitationLink);
      setCopiedInvitation(true);
      toast.success("Invitation link copied to clipboard.");
      setTimeout(() => setCopiedInvitation(false), 2000);
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    try {
      await removeParticipantMutation.mutateAsync({ roomId: room.id, userId });
      toast.success("Participant removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove participant.");
    }
  };

  const handlePublish = async () => {
    try {
      await publishMutation.mutateAsync(room.id);
      toast.success("Room published. It is now public.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish room.");
    }
  };

  const handleCopyCode = () => {
    if (room.accessCode) {
      navigator.clipboard.writeText(room.accessCode);
      setCopiedCode(true);
      toast.success("Access code copied to clipboard.");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvitationMutation.mutateAsync({ invitationId, roomId: room.id });
      toast.success("Invitation revoked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation.");
    }
  };

  const activeParticipants = allParticipants.filter(p => p.userId !== user?.id && !p.removedAt);
  const removedParticipants = allParticipants.filter(p => p.removedAt);

  // If active participant but not owner, only show the invitation creation card
  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/25 p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Participants
          </h3>
          <p className="text-xs text-muted-foreground">
            The debate owner has enabled participant invitations. Enter an email to generate an invitation link.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={handleCreateInvitation}
              disabled={createInvitationMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {createInvitationMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Invite</span>
            </button>
          </div>

          {latestInvitationLink && (
            <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs font-semibold text-foreground">Generated Invitation Link</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground select-all">
                  {latestInvitationLink}
                </code>
                <button
                  type="button"
                  onClick={handleCopyInvitation}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer transition-colors"
                  title="Copy invitation link"
                >
                  {copiedInvitation ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Share this single-use link with the invitee. They will need to accept the invitation to join.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Publication */}
      <div className="rounded-xl border border-border bg-card/25 p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Publication
        </h3>
        <p className="text-xs text-muted-foreground">
          Publishing makes this debate publicly discoverable. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {publishMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
          <span>Make Room Public</span>
        </button>
      </div>

      {/* Access Code */}
      <div className="rounded-xl border border-border bg-card/25 p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          Access Code
        </h3>
        <p className="text-xs text-muted-foreground">
          Share this code with participants so they can join the private debate.
        </p>

        {room.accessCode ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground">
              {room.accessCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-lg border border-border bg-card hover:bg-accent/40 p-2 cursor-pointer"
            >
              {copiedCode ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              type="button"
              onClick={handleClearAccessCode}
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No access code set.</div>
        )}

        {!showAccessForm ? (
          <button
            type="button"
            onClick={() => setShowAccessForm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-accent/40 px-4 py-2 text-xs font-semibold text-foreground cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>{room.accessCode ? "Change Access Code" : "Set Access Code"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={handleSetAccessCode}
              disabled={setAccessCodeMutation.isPending}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {setAccessCodeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAccessForm(false); setAccessCode(""); }}
              className="rounded-lg border border-border bg-card p-2 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Invitations */}
      <div className="rounded-xl border border-border bg-card/25 p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Invitations
        </h3>
        <p className="text-xs text-muted-foreground">
          Send email invitations to let people join this private debate.
        </p>

        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Participant Invitations</p>
            <p className="text-[10px] text-muted-foreground">
              Allow active participants to invite others when enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleParticipantInvites}
            disabled={setParticipantInvitesEnabledMutation.isPending}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
              room.participantInvitesEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                room.participantInvitesEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={handleCreateInvitation}
            disabled={createInvitationMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {createInvitationMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>Invite</span>
          </button>
        </div>

        {invitations.length > 0 && (
          <div className="space-y-2 mt-3">
            {invitations.map((invitation: RoomInvitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2"
              >
                <div className="text-xs">
                  <p className="font-medium text-foreground">
                    {invitation.email || invitation.invitedUserId || "Unknown"}
                  </p>
                  <p className="text-muted-foreground">
                    Status: <span className="font-medium">{invitation.status}</span>
                  </p>
                </div>
                {invitation.status === "active" && (
                  <button
                    type="button"
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {latestInvitationLink && (
          <div className="mt-3 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-xs font-semibold text-foreground">Generated Invitation Link</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded border border-border bg-background px-2.5 py-1.5 text-xs font-mono text-foreground select-all">
                {latestInvitationLink}
              </code>
              <button
                type="button"
                onClick={handleCopyInvitation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-accent/40 px-3 py-1.5 text-xs font-semibold text-foreground cursor-pointer transition-colors"
                title="Copy invitation link"
              >
                {copiedInvitation ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Share this single-use link with the invitee. They will need to accept the invitation to join.
            </p>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="rounded-xl border border-border bg-card/25 p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Participants
        </h3>

        {activeParticipants.length === 0 ? (
          <p className="text-xs text-muted-foreground">No other participants yet.</p>
        ) : (
          <div className="space-y-2">
            {activeParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2"
              >
                <div className="text-xs">
                  <p className="font-medium text-foreground">User {participant.userId.slice(0, 8)}...</p>
                  <p className="text-muted-foreground capitalize">{participant.side}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(participant.userId)}
                  disabled={removeParticipantMutation.isPending}
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {removedParticipants.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Removed</p>
            {removedParticipants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-2 opacity-60"
              >
                <div className="text-xs">
                  <p className="font-medium text-foreground">User {participant.userId.slice(0, 8)}...</p>
                  <p className="text-muted-foreground">Removed</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
