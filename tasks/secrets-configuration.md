# Local credentials

Never paste credentials into tracked YAML, Java, TypeScript, or example files.
Use new credentials: removing a key from Git does not revoke it with its provider.

## Spring Boot

Edit `backend-spring/.env`. It is ignored by Git and is now imported by Spring.
For a fresh checkout, copy `backend-spring/.env.example` to `backend-spring/.env`.
Do not overwrite an existing `.env` wholesale: it may contain other local settings.

Fill in `DB_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`,
`OPENCODE_ZEN_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `MAIL_USERNAME`,
and `MAIL_PASSWORD` as needed. Supply your database host/name/user as well.
Use two different random JWT secrets, at least 32 bytes each. Changing them logs
out users with tokens signed using the previous secrets.

The Spring `.env` is read as Java properties: use `NAME=value`, without surrounding
quotes or shell `export` statements. Run `backend-spring/run.bat`,
`backend-spring/run.sh`, or start the application with `backend-spring` as the
working directory. An OS environment variable overrides the local file.

`SPRING_DATASOURCE_URL`, when provided, must be a JDBC URL beginning with
`jdbc:postgresql://`; the Express `DATABASE_URL` is not a JDBC URL.

## Express and Next.js

- Express: edit `back-end/.env`; use `back-end/.env.example` for the variable names.
- Next.js: edit `front-end/.env.local`; use `front-end/.env.local.example` as a guide.
- Values prefixed with `NEXT_PUBLIC_` are included in browser code. Only put
  browser-authorized map keys and public Supabase client keys there. Private Gemini,
  OpenCode, SMTP, JWT, and Supabase service-role credentials belong on the server.
- Restart the relevant application after editing its local environment file.

## Rotation and Git

Rotate the exposed Gemini/OpenCode credentials and SMTP app password with their
providers. Change the exposed database password and JWT secrets as well. A Supabase
anon key is a public client key; review RLS and the project's key lifecycle rather
than treating it as a service-role key. Never put a service-role key in frontend code.

Git ignores `.env*` and local application overrides, except the blank example files.
The rejected commit must be replaced with a sanitized commit before retrying push;
a subsequent deletion commit alone still leaves the blocked secret in history.
Older remote history can retain previously committed credentials, so rotation is
required even after the current source and outgoing commit have been cleaned.

References: [Spring configuration](https://docs.spring.io/spring-boot/4.1-SNAPSHOT/reference/features/external-config.html),
[GitHub push protection](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/work-with-leak-prevention/push-protection-on-the-command-line).
