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
};
