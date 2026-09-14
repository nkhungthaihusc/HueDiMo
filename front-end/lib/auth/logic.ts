import type { User } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
const SESSION_KEY = "huedimo_session";
const ACCESS_TOKEN_KEY = "huedimo_access_token";
const REFRESH_TOKEN_KEY = "huedimo_refresh_token";
const ACCESS_TOKEN_EXPIRES_KEY = "huedimo_access_token_expires_at";
const REFRESH_TOKEN_EXPIRES_KEY = "huedimo_refresh_token_expires_at";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAccessTokenExpiresAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_EXPIRES_KEY);
}

export function getRefreshTokenExpiresAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_EXPIRES_KEY);
}

export function normalizeUser(raw: any): User {
  if (!raw) return raw;
  const count = Number(raw.checkinCount ?? raw.checkin_count ?? 0);
  const avatar = raw.avatarUrl || raw.avatar_url || "";
  return {
    ...raw,
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    points: Number(raw.points ?? 0),
    checkinCount: count,
    checkin_count: count,
    avatarUrl: avatar,
    avatar_url: avatar,
  };
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveSession(
  user: User,
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresAt?: string,
  refreshTokenExpiresAt?: string
) {
  if (typeof window === "undefined") return;
  const normalized = normalizeUser(user);
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (accessTokenExpiresAt) {
    localStorage.setItem(ACCESS_TOKEN_EXPIRES_KEY, accessTokenExpiresAt);
  }
  if (refreshTokenExpiresAt) {
    localStorage.setItem(REFRESH_TOKEN_EXPIRES_KEY, refreshTokenExpiresAt);
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_KEY);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_KEY);
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? "Đăng ký không thành công.",
      };
    }

    const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = json.data;
    saveSession(user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      error: "Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.",
    };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? "Email hoặc mật khẩu không đúng.",
      };
    }

    const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = json.data;
    saveSession(user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      error: "Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Đăng nhập / Đăng ký qua OAuth (Google, Facebook)
 */
export async function oauthLoginUser(
  email: string,
  name?: string,
  avatarUrl?: string,
  provider: string = "oauth"
): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/oauth-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, avatarUrl, provider }),
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? "Đăng nhập mạng xã hội thất bại.",
      };
    }

    const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = json.data;
    saveSession(user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
    return { ok: true, user };
  } catch {
    return {
      ok: false,
      error: "Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.",
    };
  }
}

/**
 * Gọi API xoay vòng Refresh Token (30 ngày) để lấy Access Token (15 phút) mới
 */
export async function refreshTokens(): Promise<{ ok: boolean; accessToken?: string }> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    clearSession();
    return { ok: false };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!res.ok) {
      clearSession();
      return { ok: false };
    }

    const json = await res.json();
    const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = json.data;
    saveSession(user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt);
    return { ok: true, accessToken };
  } catch {
    return { ok: false };
  }
}

/**
 * Lấy thông tin user hiện tại qua Access Token.
 * Nếu Access Token hết hạn (401), tự động gọi Refresh Token để cấp mới mà không bắt người dùng đăng nhập lại!
 */
export async function fetchCurrentUser(): Promise<User | null> {
  let token = getAccessToken();
  if (!token) {
    clearSession();
    return null;
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Nếu access token hết hạn (401), tự động xoay vòng refresh token
    if (res.status === 401) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) {
        clearSession();
        return null;
      }

      // Thử lại request với accessToken mới
      token = refreshRes.accessToken;
      res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        clearSession();
        return null;
      }
    }

    const json = await res.json();
    const rawUser = json.data?.user;
    if (rawUser) {
      const user = normalizeUser(rawUser);
      const currentRefreshToken = getRefreshToken() || "";
      const accessExpires = getAccessTokenExpiresAt() || undefined;
      const refreshExpires = getRefreshTokenExpiresAt() || undefined;
      saveSession(user, token, currentRefreshToken, accessExpires, refreshExpires);
      return user;
    }
    return null;
  } catch {
    return getSession();
  }
}

export async function updateUserProfile(data: {
  name?: string;
  avatarUrl?: string;
  avatar_url?: string;
}): Promise<{ ok: boolean; user?: User; error?: string }> {
  let token = getAccessToken();
  if (!token) {
    return { ok: false, error: "Vui lòng đăng nhập lại để cập nhật thông tin." };
  }

  const targetAvatar = data.avatar_url ?? data.avatarUrl;
  const payload: Record<string, any> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (targetAvatar !== undefined) {
    payload.avatar_url = targetAvatar;
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) {
        clearSession();
        return { ok: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
      }
      token = refreshRes.accessToken;
      res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? "Cập nhật hồ sơ thất bại.",
      };
    }

    const rawUpdatedUser = json.data?.user;
    if (rawUpdatedUser) {
      const updatedUser = normalizeUser(rawUpdatedUser);
      const currentRefreshToken = getRefreshToken() || "";
      const accessExpires = getAccessTokenExpiresAt() || undefined;
      const refreshExpires = getRefreshTokenExpiresAt() || undefined;
      saveSession(updatedUser, token, currentRefreshToken, accessExpires, refreshExpires);
      return { ok: true, user: updatedUser };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.",
    };
  }
}

export function logoutUser() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
  // Đăng xuất khỏi phiên Google / Supabase Auth nếu có
  try {
    supabase.auth.signOut().catch(() => {});
  } catch {}
  clearSession();
}

