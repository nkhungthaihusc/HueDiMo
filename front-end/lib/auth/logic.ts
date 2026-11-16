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
  localStorage.removeItem("huedimo_itineraries");
  localStorage.removeItem("huedimo_itineraries_guest");
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  otp: string,
): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, otp }),
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
 * Đăng nhập / Đăng ký qua OAuth (Google)
 */
export async function oauthLoginUser(supabaseAccessToken: string, googleAccessToken?: string | null): Promise<{ ok: boolean; user?: User; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/oauth-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: supabaseAccessToken, googleAccessToken: googleAccessToken ?? undefined }),
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
let pendingRefresh: { token: string; request: Promise<{ ok: boolean; accessToken?: string }> } | undefined;

export function refreshTokens(): Promise<{ ok: boolean; accessToken?: string }> {
  const token = getRefreshToken();
  if (!token) {
    clearSession();
    return Promise.resolve({ ok: false });
  }
  if (pendingRefresh?.token === token) return pendingRefresh.request;

  const accountId = getSession()?.id;
  const refresh = async () => {
    if (getSession()?.id !== accountId) return { ok: false };
    const latestRefreshToken = getRefreshToken();
    if (latestRefreshToken === token) return rotateRefreshToken(token);

    const accessToken = getAccessToken();
    return latestRefreshToken && accessToken ? { ok: true, accessToken } : { ok: false };
  };
  const rotation = Promise.resolve(navigator.locks
    ? navigator.locks.request("huedimo-refresh-token", refresh)
    : refresh());
  const request = rotation.catch(() => ({ ok: false })).finally(() => {
    if (pendingRefresh?.request === request) pendingRefresh = undefined;
  });
  pendingRefresh = { token, request };
  return request;
}

async function rotateRefreshToken(currentRefreshToken: string): Promise<{ ok: boolean; accessToken?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (getRefreshToken() !== currentRefreshToken) return { ok: false };
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) clearSession();
      return { ok: false };
    }

    const json = await res.json();
    const { user, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt } = json.data;
    if (getRefreshToken() !== currentRefreshToken) return { ok: false };
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
    token = (await refreshTokens()).accessToken ?? null;
    if (!token) return getSession();
  }

  try {
    let res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}` },
    });

    // Nếu access token hết hạn (401), tự động xoay vòng refresh token
    if (res.status === 401 && getAccessToken() === token) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) {
        return getSession();
      }

      // Thử lại request với accessToken mới
      token = refreshRes.accessToken;
      res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!res.ok || getAccessToken() !== token) return getSession();
    const json = await res.json();
    if (getAccessToken() !== token) return getSession();
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
  const accountId = getSession()?.id;
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

    if (res.status === 401 && getSession()?.id === accountId) {
      const refreshRes = await refreshTokens();
      if (!refreshRes.ok || !refreshRes.accessToken) {
        return { ok: false, error: "Không thể xác thực để cập nhật hồ sơ. Vui lòng thử lại." };
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
    if (rawUpdatedUser && getSession()?.id === accountId && getAccessToken() === token) {
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

