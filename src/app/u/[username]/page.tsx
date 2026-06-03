import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { getProfileByUsername } from "@/features/profiles/services/profile-service";
import { Calendar, User, MessageSquare, Scale, Award, FileText } from "lucide-react";

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

  const joinDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

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

      {/* Activity Statistics Placeholders */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 tracking-tight">Activity Statistics</h2>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Discussions Created */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Discussions</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold">--</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Debates Created */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Scale className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Debates</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold">--</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Claims Created */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Award className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Claims</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold">--</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Evidence Added */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Evidence Added</p>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-bold">--</span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
