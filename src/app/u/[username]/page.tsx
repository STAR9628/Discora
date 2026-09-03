import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getProfileByUsername } from "@/features/profiles/services/profile-service";
import { getUserContributions } from "@/features/reputation/services/reputation-service";
import type { LucideIcon } from "lucide-react";
import { Calendar, User, MessageSquare, Scale, Award, FileText, Swords, Trophy, TrendingDown } from "lucide-react";
import { formatDate } from "@/lib/date";
import { ProfileReputationSection } from "@/features/reputation/components/profile-reputation-section";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

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

  let contributions: Awaited<ReturnType<typeof getUserContributions>> = { claims: [], evidence: [], questions: [], discussionCount: 0, debateCount: 0, debateParticipations: [], debateWins: 0, debateLosses: 0, evidenceAgreeCount: 0, evidenceDisagreeCount: 0 };
  try {
    contributions = await getUserContributions(profile.id, supabase);
  } catch (error) {
    console.error("Error fetching contributions:", error);
  }

  // Fetch user preferences for privacy gating
  let showReputation = true;
  let showExpertise = true;
  let showSideSwitches = true;
  try {
    const { data: prefs } = await supabase.rpc("get_user_preferences", {
      p_user_id: profile.id,
    });
    if (prefs && prefs.length > 0) {
      showReputation = prefs[0].show_reputation;
      showExpertise = prefs[0].show_expertise;
      showSideSwitches = prefs[0].show_side_switches;
    }
  } catch {
    // Default to showing everything if preferences can't be loaded
  }

  const activeClaims = contributions.claims.filter((c) => !c.isRetracted).length;
  const activeEvidence = contributions.evidence.filter((e) => !e.isRetracted).length;


  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              @{profile.username}
            </h1>
            {profile.bio ? (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground/60">No bio provided</p>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1 sm:justify-start text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Joined {joinDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 tracking-tight">Activity Statistics</h2>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={MessageSquare} label="Discussions" value={contributions.discussionCount} />
          <StatCard icon={Swords} label="Debates Joined" value={contributions.debateParticipations.length} />
          <StatCard icon={Award} label="Claims" value={activeClaims} />
          <StatCard icon={FileText} label="Evidence Added" value={activeEvidence} />
        </div>

        {(contributions.debateWins > 0 || contributions.debateLosses > 0) && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Scale} label="Debates Created" value={contributions.debateCount} />
            <StatCard icon={Trophy} label="Debates Won" value={contributions.debateWins} />
            <StatCard icon={TrendingDown} label="Debates Lost" value={contributions.debateLosses} />
            <StatCard icon={Swords} label="Win Rate" value={contributions.debateWins + contributions.debateLosses > 0
              ? `${Math.round((contributions.debateWins / (contributions.debateWins + contributions.debateLosses)) * 100)}%`
              : "0%"
            } />
          </div>
        )}
      </div>

      {/* Reputation & Contributions Section */}
      <ProfileReputationSection
        userId={profile.id}
        showReputation={showReputation}
        showExpertise={showExpertise}
        showSideSwitches={showSideSwitches}
      />
    </main>
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
