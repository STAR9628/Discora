"use client";

import React from "react";

interface RoomHeaderActionsProps {
  /** When false (compact sticky header), each child hides its text label. */
  showLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Groups header action buttons (e.g. Save + Share) and forwards a shared
 * `showLabel` flag to each child so the compact sticky header can render the
 * same actions icon-only without modifying each button individually.
 */
export function RoomHeaderActions({ showLabel = true, className = "", children }: RoomHeaderActionsProps) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<{ showLabel?: boolean }>, { showLabel });
      })}
    </div>
  );
}