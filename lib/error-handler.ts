import { toast } from "@/hooks/use-toast";
import { APIError } from "./api-client";

/**
 * Global error handler for API errors
 * Displays user-friendly error messages using toast notifications
 */
export const handleAPIError = (error: unknown, customMessage?: string): void => {
  console.error("API Error:", error);

  let errorMessage = customMessage || "An unexpected error occurred";
  let errorTitle = "Error";

  if (isAPIError(error)) {
    errorMessage = error.message;

    // Customize title based on status
    if (error.status === 401) {
      errorTitle = "Authentication Error";
    } else if (error.status === 403) {
      errorTitle = "Permission Denied";
    } else if (error.status === 404) {
      errorTitle = "Not Found";
    } else if (error.status === 422) {
      errorTitle = "Validation Error";
    } else if (error.status >= 500) {
      errorTitle = "Server Error";
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Show toast notification
  toast({
    variant: "destructive",
    title: errorTitle,
    description: errorMessage,
  });
};

/**
 * Type guard to check if error is an APIError
 */
export const isAPIError = (error: unknown): error is APIError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "status" in error
  );
};

/**
 * Success notification helper
 */
export const showSuccess = (message: string, title: string = "Success") => {
  toast({
    title,
    description: message,
  });
};

/**
 * Info notification helper
 */
export const showInfo = (message: string, title: string = "Info") => {
  toast({
    title,
    description: message,
  });
};
