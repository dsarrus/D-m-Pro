export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}
