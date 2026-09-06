export type OnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type DiscoveryDeckTab = "model" | "sandbox" | "modes" | "interests";

export type EpistemicSupportState =
  | "limited_support"
  | "more_supported"
  | "mixed_contested"
  | "unresolved";

export type ExplorationTopicId =
  | "ai_tech"
  | "science_climate"
  | "philosophy_ethics"
  | "society_governance";

export type PreferredFormat = "discussion" | "debate" | "both";

export interface ExplorationTopicOption {
  id: ExplorationTopicId;
  label: string;
  description: string;
  badge: string;
}

export interface OnboardingState {
  status: OnboardingStatus;
  currentTab: DiscoveryDeckTab;
  dismissedGuides: Record<string, boolean>;
  selectedTopics: ExplorationTopicId[];
  preferredFormat: PreferredFormat;
  hasInteractedSandbox: boolean;
  isDeckOpen: boolean;
  lastUpdated: string;
}
