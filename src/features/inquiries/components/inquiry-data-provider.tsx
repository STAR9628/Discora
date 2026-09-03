"use client";

import React, { createContext, useContext } from "react";
import type { InquiryItem } from "../types";

interface InquiryContextValue {
  inquiry: InquiryItem;
}

const InquiryContext = createContext<InquiryContextValue | null>(null);

export function InquiryDataProvider({
  inquiry,
  children,
}: {
  inquiry: InquiryItem;
  children: React.ReactNode;
}) {
  return (
    <InquiryContext.Provider value={{ inquiry }}>
      {children}
    </InquiryContext.Provider>
  );
}

export function useInquiryContext() {
  const ctx = useContext(InquiryContext);
  if (!ctx) {
    throw new Error("useInquiryContext must be used within InquiryDataProvider");
  }
  return ctx;
}
