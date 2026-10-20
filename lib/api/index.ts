/**
 * API Client Module
 *
 * Centralized API client with error handling and type safety.
 * All API calls should go through this module.
 */

export { apiClient, get, post, put, del, patch } from "../api-client";
export type { APIError, APIResponse } from "../api-client";

// Export all API modules
export * from "./users";
export * from "./sessions";
export * from "./feedback";
export * from "./health";
