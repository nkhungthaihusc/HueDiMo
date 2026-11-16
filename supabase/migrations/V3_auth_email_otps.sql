BEGIN;

-- Spring keeps writing and reading rows whose purpose is NULL.
ALTER TABLE public.otps
  ALTER COLUMN otp_code TYPE varchar,
  ADD COLUMN purpose varchar(32)
    CHECK (purpose IN ('change_password', 'reset_password', 'register')),
  ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5);

CREATE UNIQUE INDEX otps_email_purpose_idx ON public.otps (email, purpose)
  WHERE purpose IS NOT NULL;

ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.otps FROM PUBLIC, anon, authenticated;

COMMIT;
