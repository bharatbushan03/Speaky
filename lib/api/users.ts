import { get, post } from "@/lib/api-client";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface CreateUserResponse extends User {}

export const usersAPI = {
  /**
   * Create a new user
   */
  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    return post<CreateUserResponse>("/api/v1/users/", data);
  },

  /**
   * Get user by ID
   */
  getUser: async (userId: string): Promise<User> => {
    return get<User>(`/api/v1/users/${userId}`);
  },
};
