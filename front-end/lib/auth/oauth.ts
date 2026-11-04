const PRODUCTION_ORIGIN = "https://huedimo.hungthaisoft.id.vn";

export function getOAuthRedirectUrl(currentOrigin: string): string {
  const current = new URL(currentOrigin);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(current.hostname);
  return new URL("/auth/callback", isLocal ? current.origin : PRODUCTION_ORIGIN).toString();
}
