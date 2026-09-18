"use client";

import { usePathname } from "next/navigation";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import { DiscussionDataProvider } from "@/features/discussions/components/discussion-data-provider";
import { RoomSectionShell, type RoomLens } from "@/features/rooms/components/room-section-shell";
import { SaveButton } from "@/features/saves/components/save-button";
import { ShareButton } from "@/components/share/share-button";
import { RoomHeaderActions } from "@/components/share/room-header-actions";

interface DiscussionRoomLayoutProps {
  discussionItem: DiscussionFeedItem;
  children: React.ReactNode;
}

export function DiscussionRoomLayout({ discussionItem, children }: DiscussionRoomLayoutProps) {
  const pathname = usePathname();
  const slug = discussionItem.room.slug;

  // Determine active lens from pathname
  const activeLens: RoomLens = (() => {
    if (pathname === `/discussions/${slug}` || pathname === `/discussions/${slug}/contributions`) {
      return "conversation";
    }
    if (pathname === `/discussions/${slug}/claims`) {
      return "claims";
    }
    if (pathname === `/discussions/${slug}/evidence`) {
      return "evidence";
    }
    if (pathname === `/discussions/${slug}/sources`) {
      return "sources";
    }
    if (pathname === `/discussions/${slug}/questions`) {
      return "questions";
    }
    if (pathname === `/discussions/${slug}/understanding`) {
      return "understanding";
    }
    return "conversation";
  })();

  return (
    <DiscussionDataProvider roomId={discussionItem.room.id}>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <RoomSectionShell
          roomType="discussion"
          slug={slug}
          title={discussionItem.room.title}
          description={discussionItem.room.description}
          premise={discussionItem.discussion?.openingStatement}
          section={activeLens}
          headerAction={
            <RoomHeaderActions showLabel>
              <SaveButton targetType="discussion" targetId={discussionItem.room.id} />
              {discussionItem.room.visibility === "public" && (
                <ShareButton
                  ariaLabel="Share this discussion"
                  shareTitle={discussionItem.room.title}
                  shareText="Take a look at this discussion on Discora."
                  sharePath={`/discussions/${slug}`}
                />
              )}
            </RoomHeaderActions>
          }
        >
          {children}
        </RoomSectionShell>
      </main>
    </DiscussionDataProvider>
  );
}
