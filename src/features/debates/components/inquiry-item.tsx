"use client";

import React from "react";
import { InquiryCard } from "@/features/inquiries/components/inquiry-card";
import type { InquiryItem as InquiryItemType } from "@/features/inquiries/types";

interface InquiryItemProps {
  inquiry: InquiryItemType;
  roomId: string;
}

export function InquiryItem({ inquiry }: InquiryItemProps) {
  return <InquiryCard inquiry={inquiry} showLinkToStandalone />;
}
