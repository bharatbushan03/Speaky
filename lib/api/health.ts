import { get } from "@/lib/api-client";

export interface HealthResponse {
  status: string;
  service: string;
  version?: string;
}

export interface ReadinessResponse {
  status: string;
  database: string;
  ai_service: string;
}

export interface ProviderDiagnostics {
  llm: { provider: string; model: string; configured: boolean; role: string };
  tts: { provider: string; model: string; voice: string; configured: boolean; endpoint: string };
  stt: { provider: string; model: string; configured: boolean; endpoint: string };
  evon: { available: boolean; reason: string };
}

export const healthAPI = {
  /**
   * Check API health status
   */
  checkHealth: async (): Promise<HealthResponse> => {
    return get<HealthResponse>("/api/v1/health/");
  },

  /**
   * Check API readiness
   */
  checkReadiness: async (): Promise<ReadinessResponse> => {
    return get<ReadinessResponse>("/api/v1/health/ready");
  },

  getProviders: async (): Promise<ProviderDiagnostics> => {
    return get<ProviderDiagnostics>("/api/v1/health/providers");
  },
};
