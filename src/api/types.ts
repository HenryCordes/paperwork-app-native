export interface ApiError {
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserProfile {
  _id: string;
  name: string;
  companyName: string;
  email: string;
  role: string;
  organization: string;
  createdAt: string;
  __v: number;
}
