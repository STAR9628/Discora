import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createInquiry,
  respondToInquiry,
  satisfyInquiry,
  unsatisfyInquiry,
  closeInquiry,
  getInquiryById,
  getInquiriesForTarget,
  getInquiryResponses,
  getInquiryCountsByRoom,
  getInquiriesByRoom,
} from "../services/inquiry-service";
import type { InquiryType } from "../types";

export function useInquiry(inquiryId: string) {
  return useQuery({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => getInquiryById(inquiryId),
    enabled: !!inquiryId,
    staleTime: 10_000,
  });
}

export function useInquiries(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["inquiries", roomId],
    queryFn: () => getInquiriesByRoom(roomId),
    staleTime: 10_000,
    enabled: !!roomId && enabled,
  });
}

export function useCreateInquiry(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      targetClaimId: string;
      inquiryType: InquiryType;
      content: string;
    }) => createInquiry(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId, "target", variables.targetClaimId] });
      queryClient.invalidateQueries({ queryKey: ["inquiryCounts", roomId] });
    },
  });
}

export function useRespondToInquiry(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      inquiryItemId: string;
      content: string;
    }) => respondToInquiry(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry", variables.inquiryItemId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry-responses", variables.inquiryItemId] });
    },
  });
}

export function useSatisfyInquiry(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryItemId: string) => satisfyInquiry(inquiryItemId),
    onSuccess: (_, inquiryItemId) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry", inquiryItemId] });
    },
  });
}

export function useUnsatisfyInquiry(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryItemId: string) => unsatisfyInquiry(inquiryItemId),
    onSuccess: (_, inquiryItemId) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry", inquiryItemId] });
    },
  });
}

export function useCloseInquiry(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inquiryItemId: string) => closeInquiry(inquiryItemId),
    onSuccess: (_, inquiryItemId) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry", inquiryItemId] });
    },
  });
}

export function useInquiriesForTarget(roomId: string, targetClaimId: string) {
  return useQuery({
    queryKey: ["inquiries", roomId, "target", targetClaimId],
    queryFn: () => getInquiriesForTarget(targetClaimId),
    staleTime: 10_000,
    enabled: !!roomId && !!targetClaimId,
  });
}

export function useInquiryCountsForRoom(roomId: string) {
  return useQuery({
    queryKey: ["inquiryCounts", roomId],
    queryFn: () => getInquiryCountsByRoom(roomId),
    staleTime: 10_000,
    enabled: !!roomId,
  });
}

export function useInquiryResponses(inquiryItemId: string) {
  return useQuery({
    queryKey: ["inquiry-responses", inquiryItemId],
    queryFn: () => getInquiryResponses(inquiryItemId),
    staleTime: 10_000,
    enabled: !!inquiryItemId,
  });
}
