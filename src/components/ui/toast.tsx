import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
};

export const toast = {
  success: (message: string, options?: ToastProps) =>
    sonnerToast.success(message, {
      description: options?.description,
    }),
  error: (message: string, options?: ToastProps) =>
    sonnerToast.error(message, {
      description: options?.description,
    }),
  info: (message: string, options?: ToastProps) =>
    sonnerToast.info(message, {
      description: options?.description,
    }),
  warning: (message: string, options?: ToastProps) =>
    sonnerToast.warning(message, {
      description: options?.description,
    }),
};
