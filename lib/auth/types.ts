export interface User {
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface Session {
  sessionId: string;
  username: string;
  createdAt: number;
  lastSeen: number;
  csrfToken: string;
}

export interface IpRateLimit {
  count: number;
  windowStart: number;
}

export interface UserRateLimit {
  count: number;
  firstFailAt: number;
}
