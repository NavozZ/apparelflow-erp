
-- Protect verification audit records from modifications.
-- Existing audit records remain readable.

CREATE OR REPLACE FUNCTION public.prevent_verification_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Verification audit records are immutable and cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS
  verification_logs_immutable
ON public.verification_logs;

CREATE TRIGGER verification_logs_immutable
BEFORE UPDATE OR DELETE
ON public.verification_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_verification_log_modification();
