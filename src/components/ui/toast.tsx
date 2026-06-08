import { toast as sonnerToast } from "sonner";

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastProps = {
  title?: string;
  description?: string;
  action?: ToastAction;
};

export const toast = {
  success: (message: string, options?: ToastProps) =>
    sonnerToast.success(message, {
      description: options?.description,
      action: options?.action,
    }),
  error: (message: string, options?: ToastProps) =>
    sonnerToast.error(message, {
      description: options?.description,
      action: options?.action,
    }),
  info: (message: string, options?: ToastProps) =>
    sonnerToast.info(message, {
      description: options?.description,
      action: options?.action,
    }),
  warning: (message: string, options?: ToastProps) =>
    sonnerToast.warning(message, {
      description: options?.description,
      action: options?.action,
    }),
};
