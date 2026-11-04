# OAuth production domain

Production frontend: `https://huedimo.hungthaisoft.id.vn`.
Google and Facebook sign-in both use:
`https://huedimo.hungthaisoft.id.vn/auth/callback`.
The previous Vercel hostname no longer determines the frontend callback URL.
Local development on localhost, 127.0.0.1, and IPv6 loopback retains its own port.

## Supabase dashboard configuration

Open Authentication → URL Configuration in the HueDiMo Supabase project:

- Site URL: `https://huedimo.hungthaisoft.id.vn`
- Add this exact Redirect URL: `https://huedimo.hungthaisoft.id.vn/auth/callback`
- Retain localhost callback entries needed for development, for example
  `http://localhost:3000/auth/callback`.
- Replace any obsolete Vercel redirect entries that are no longer in use.

These dashboard settings are separate from the source code. The dashboard update
has not been performed by this change. If the supplied redirect URL is not allowed,
Supabase can fall back to the configured Site URL, including an old Vercel URL.

The OAuth provider's authorized redirect URI is the Supabase Auth endpoint
`https://vhyfauholmouikskxecp.supabase.co/auth/v1/callback`; it is different from
the frontend `/auth/callback` route and does not change with this frontend domain.

Deploy the updated frontend and verify Google/Facebook return to the new domain.

Reference: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
