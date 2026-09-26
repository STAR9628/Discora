import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getProfileByUsername } from "@/features/profiles/services/profile-service";
import { getUserContributions } from "@/features/reputation/services/reputation-service";
import type { LucideIcon } from "lucide-react";
import { Calendar, User, MessageSquare, Award, FileText, Swords, HelpCircle } from "lucide-react";
import { formatDate } from "@/lib/date";
import { ProfileReputationSection } from "@/features/reputation/components/profile-reputation-section";
import { ShareButton } from "@/components/share/share-button";
import { ProfileFriendControl } from "@/features/friends/components/profile-friend-control";
import { ProfileTitleBadge } from "@/features/founding/components/profile-title-badge";
import { getSiteUrl } from "@/lib/site-url";
import { truncateText } from "@/lib/text";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createServerSupabaseClient();
  let profile = null;

  try {
    profile = await getProfileByUsername(username, supabase);
  } catch (error) {
    console.error("Error generating metadata for profile:", error);
  }

  if (!profile) {
    return {
      title: "User not found",
      robots: { index: false },
    };
  }

  const siteUrl = await getSiteUrl();
  const displayName = profile.displayName || `@${profile.username}`;
  const description = truncateText(profile.bio) || `${displayName} on Discora.`;
  const ogImage = profile.avatarUrl?.startsWith("http")
    ? { url: profile.avatarUrl, alt: displayName }
    : undefined;

  return {
    title: displayName,
    description,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: `/u/${username}` },
    openGraph: {
      type: "profile",
      title: displayName,
      description,
      url: `/u/${username}`,
      siteName: "Discora",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  
  const supabase = await createServerSupabaseClient();
  let profile = null;

  try {
    profile = await getProfileByUsername(username, supabase);
  } catch (error) {
    console.error("Error fetching profile:", error);
  }

  if (!profile) {
    notFound();
  }

  const joinDate = formatDate(profile.joinedAt, {
    month: "long",
    year: "numeric",
  });

  let contributions: Awaited<ReturnType<typeof getUserContributions>> = { claims: [], evidence: [], questions: [], discussionCount: 0, debateCount: 0, debateParticipations: [] };
  try {
    contributions = await getUserContributions(profile.id, supabase);
  } catch (error) {
    console.error("Error fetching contributions:", error);
  }

  // Automatic Founding Participant recognition when viewing your own profile.
  // The RPC grants profiles.is_founding_member to the caller only when
  // discussion + debate participation both exist. Never breaks rendering.
  try {
    const {
      data: { user: viewer },
    } = await supabase.auth.getUser();
    if (viewer?.id === profile.id && !profile.isFoundingMember) {
      const { data: foundingStatus } = await supabase.rpc("evaluate_founding_status");
      const row = (Array.isArray(foundingStatus) ? foundingStatus[0] : foundingStatus) as {
        is_founding_member?: boolean;
      } | null;
      if (row?.is_founding_member) {
        profile.isFoundingMember = true;
      }
    }
  } catch {
    // Ignore eligibility-check failures; the page must always render.
  }

  // Fetch user preferences for privacy gating.
  // Narrow public-display RPC: returns only show_expertise/show_side_switches
  // for any profile (guest-reachable); show_reputation stays self-only.
  let showExpertise = true;
  let showSideSwitches = true;
  try {
    const { data: prefs } = await supabase.rpc("get_public_display_flags", {
      p_user_id: profile.id,
    });
    if (prefs && prefs.length > 0) {
      showExpertise = prefs[0].show_expertise;
      showSideSwitches = prefs[0].show_side_switches;
    }
  } catch {
    // Default to showing everything if preferences can't be loaded
  }

  const activeClaims = contributions.claims.filter((c) => !c.isRetracted).length;
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted).length;


  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile Info Header */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 md:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 bg-primary/5 blur-3xl rounded-full" />
        
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          {/* Avatar */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={`${profile.username}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {profile.displayName || `@${profile.username}`}
              </h1>
              {profile.displayName && (
                <span className="text-sm font-normal text-muted-foreground">
                  @{profile.username}
                </span>
              )}
              <ProfileTitleBadge
                platformTitle={profile.platformTitle ?? null}
                isFoundingMember={profile.isFoundingMember ?? false}
              />
            </div>
            {profile.bio ? (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground">No bio provided</p>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 sm:justify-start">
              <ProfileFriendControl
                targetUserId={profile.id}
                targetLabel={profile.displayName || `@${profile.username}`}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1 sm:justify-start text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Joined {joinDate}
              </span>
              <ShareButton
                shareTitle={profile.displayName || `@${profile.username}`}
                shareText="Check out this Discora profile."
                sharePath={`/u/${profile.username}`}
                ariaLabel="Share this profile"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 tracking-tight">Participation Overview</h2>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MessageSquare} label="Discussions" value={contributions.discussionCount} />
          <StatCard icon={Swords} label="Debates Joined" value={contributions.debateParticipations.length} />
          <StatCard icon={Award} label="Claims" value={activeClaims} />
          <StatCard icon={FileText} label="Evidence Added" value={activeEvidence} />
          <StatCard icon={HelpCircle} label="Questions" value={contributions.questions.filter((q) => !q.isRetracted).length} />
          <StatCard icon={FileText} label="Sources Cited" value={new Set(contributions.evidence.filter((e) => !e.isRetracted && e.sourceUrl).map((e) => e.sourceUrl)).size} />
        </div>
      </div>

      {/* Contributions Section */}
      <ProfileReputationSection
        userId={profile.id}
        showExpertise={showExpertise}
        showSideSwitches={showSideSwitches}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
    </div>
  );
}
