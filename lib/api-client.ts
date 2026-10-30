import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { getSupabaseClient, getSupabaseConfigurationError } from "@/lib/supabase";

// API response types
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface APIError {
  message: string;
  status: number;
  code?: string;
  errors?: unknown[];
  requestId?: string;
}

export function getAPIErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unable to save or load the session. Please try again.";
}

// Create axios instance with default config. Built on first use so a missing
// env var does not crash pages that never call the API (including next build).
const createAPIClient = (): AxiosInstance => {
  const apiURL = process.env.NEXT_PUBLIC_API_URL;
  if (!apiURL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured. Set the FastAPI URL before starting the frontend.");
  }

  const client = axios.create({
    baseURL: apiURL.replace(/\/+$/, ""),
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(
    async (config) => {
      const configurationError = getSupabaseConfigurationError();
      if (configurationError) {
        return Promise.reject({ message: configurationError, status: 503 });
      }
      const { data, error } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (error || !token) {
        return Promise.reject({ message: "Please sign in again to continue.", status: 401 });
      }
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors globally
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        // Preserve our safe auth errors without retaining request headers.
        return Promise.reject({
          message: getAPIErrorMessage(error),
          status: error && typeof error === "object" && "status" in error ? error.status : 0,
          code: error && typeof error === "object" && "code" in error ? error.code : undefined,
        });
      }
      const apiError: APIError = {
        message: "An unexpected error occurred",
        status: 500,
      };

      if (error.response) {
        // Server responded with error status
        apiError.status = error.response.status;
        const body = error.response.data as {
          detail?: unknown; code?: string; errors?: unknown[]; request_id?: string;
        } | undefined;
        apiError.message = typeof body?.detail === "string" ? body.detail :
          error.response.status === 401 ? "Please sign in again to continue." :
          "The request failed. Please try again.";
        apiError.code = body?.code;
        apiError.errors = body?.errors;
        apiError.requestId = body?.request_id;
      } else if (error.request) {
        // Request made but no response received
        apiError.message = "Network error. Please check your connection.";
        apiError.status = 0;
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};

let apiClientInstance: AxiosInstance | undefined;

function getAPIClient(): AxiosInstance {
  if (!apiClientInstance) apiClientInstance = createAPIClient();
  return apiClientInstance;
}

// Preserve `apiClient.get` / `apiClient.post` without creating the client at import time.
export const apiClient = new Proxy({} as AxiosInstance, {
  get(_target, property) {
    const instance = getAPIClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

// Helper function for GET requests
export const get = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.get<T>(url, config);
  return response.data;
};

// Helper function for POST requests
export const post = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
};

// Helper function for PUT requests
export const put = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
};

// Helper function for DELETE requests
export const del = async <T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
};

// Helper function for PATCH requests
export const patch = async <T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
};
