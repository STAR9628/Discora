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
  editInquiry,
  deleteInquiry,
  editInquiryResponse,
  deleteInquiryResponse,
} from "../services/inquiry-service";
import type { InquiryItem, InquiryResponse, InquiryType } from "../types";

export function useInquiry(inquiryId: string) {
  return useQuery({
    queryKey: ["inquiry", inquiryId],
    queryFn: () => getInquiryById(inquiryId),
    enabled: !!inquiryId,
    staleTime: 10_000,
  });
}

export function useInquiries(roomId: string, enabled: boolean = true, initialData?: InquiryItem[]) {
  return useQuery({
    queryKey: ["inquiries", roomId],
    queryFn: () => getInquiriesByRoom(roomId),
    staleTime: 10_000,
    enabled: !!roomId && enabled,
    initialData,
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

export function useInquiryCountsForRoom(roomId: string, initialData?: Record<string, number>) {
  return useQuery({
    queryKey: ["inquiryCounts", roomId],
    queryFn: () => getInquiryCountsByRoom(roomId),
    staleTime: 10_000,
    enabled: !!roomId,
    initialData,
  });
}

export function useInquiryResponses(inquiryItemId: string, initialData?: InquiryResponse[]) {
  return useQuery({
    queryKey: ["inquiry-responses", inquiryItemId],
    queryFn: () => getInquiryResponses(inquiryItemId),
    staleTime: 10_000,
    enabled: !!inquiryItemId,
    initialData,
  });
}

export function useEditInquiry(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inquiryId, content }: { inquiryId: string; content: string }) =>
      editInquiry(inquiryId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiry", variables.inquiryId] });
    },
  });
}

export function useDeleteInquiry(roomId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inquiryId: string) => deleteInquiry(inquiryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries", roomId] });
      queryClient.invalidateQueries({ queryKey: ["inquiryCounts", roomId] });
    },
  });
}

export function useEditInquiryResponse(inquiryItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ responseId, content }: { responseId: string; content: string }) =>
      editInquiryResponse(responseId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiry-responses", inquiryItemId] });
    },
  });
}

export function useDeleteInquiryResponse(inquiryItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (responseId: string) => deleteInquiryResponse(responseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiry-responses", inquiryItemId] });
    },
  });
}
