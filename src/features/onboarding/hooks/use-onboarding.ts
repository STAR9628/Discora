"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  OnboardingState,
  DiscoveryDeckTab,
  ExplorationTopicId,
  PreferredFormat,
} from "../types";

const STORAGE_KEY = "discora_onboarding_v1";
const SYNC_EVENT = "discora_onboarding_changed";

const DEFAULT_STATE: OnboardingState = {
  status: "not_started",
  currentTab: "model",
  dismissedGuides: {},
  selectedTopics: [],
  preferredFormat: "both",
  hasInteractedSandbox: false,
  isDeckOpen: false,
  lastUpdated: new Date().toISOString(),
};

function readState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      dismissedGuides: parsed.dismissedGuides || {},
      selectedTopics: Array.isArray(parsed.selectedTopics) ? parsed.selectedTopics : [],
      // isDeckOpen is session/transient, do not persist as true on full page refresh
      isDeckOpen: false,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        isDeckOpen: false, // keep stored open flag false
        lastUpdated: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore storage quota / incognito errors safely
  }
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: state }));
  }, 0);
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(readState);

  useEffect(() => {
    // Sync on mount
    setState(readState());

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<OnboardingState>;
      if (customEvent.detail) {
        setState(customEvent.detail);
      } else {
        setState(readState());
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const openDeck = useCallback((initialTab?: DiscoveryDeckTab) => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        status: prev.status === "not_started" ? "in_progress" : prev.status,
        currentTab: initialTab || prev.currentTab || "model",
        isDeckOpen: true,
      };
      writeState(next);
      return next;
    });
  }, []);

  const closeDeck = useCallback(() => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        isDeckOpen: false,
      };
      writeState(next);
      return next;
    });
  }, []);

  const setTab = useCallback((tab: DiscoveryDeckTab) => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        currentTab: tab,
      };
      writeState(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        status: "completed",
        isDeckOpen: false,
      };
      writeState(next);
      return next;
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        status: "skipped",
        isDeckOpen: false,
      };
      writeState(next);
      return next;
    });
  }, []);

  const toggleTopic = useCallback((topicId: ExplorationTopicId) => {
    setState((prev) => {
      const exists = prev.selectedTopics.includes(topicId);
      const nextTopics = exists
        ? prev.selectedTopics.filter((t) => t !== topicId)
        : [...prev.selectedTopics, topicId];
      const next: OnboardingState = {
        ...prev,
        selectedTopics: nextTopics,
      };
      writeState(next);
      return next;
    });
  }, []);

  const setPreferredFormat = useCallback((format: PreferredFormat) => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        preferredFormat: format,
      };
      writeState(next);
      return next;
    });
  }, []);

  const dismissGuide = useCallback((guideKey: string) => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        dismissedGuides: {
          ...prev.dismissedGuides,
          [guideKey]: true,
        },
      };
      writeState(next);
      return next;
    });
  }, []);

  const markSandboxInteracted = useCallback(() => {
    setState((prev) => {
      const next: OnboardingState = {
        ...prev,
        hasInteractedSandbox: true,
      };
      writeState(next);
      return next;
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    const fresh: OnboardingState = {
      ...DEFAULT_STATE,
      isDeckOpen: true,
      lastUpdated: new Date().toISOString(),
    };
    writeState(fresh);
    setState(fresh);
  }, []);

  return {
    state,
    isDeckOpen: state.isDeckOpen,
    status: state.status,
    currentTab: state.currentTab,
    dismissedGuides: state.dismissedGuides,
    selectedTopics: state.selectedTopics,
    preferredFormat: state.preferredFormat,
    hasInteractedSandbox: state.hasInteractedSandbox,
    openDeck,
    closeDeck,
    setTab,
    completeOnboarding,
    skipOnboarding,
    toggleTopic,
    setPreferredFormat,
    dismissGuide,
    markSandboxInteracted,
    resetOnboarding,
  };
}
