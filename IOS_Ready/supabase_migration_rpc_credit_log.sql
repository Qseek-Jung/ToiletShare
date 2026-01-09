-- RLS를 우회하여 크레딧 로그를 작성하는 보안 함수 (Security Definer)
-- 이 함수는 Supabase Auth가 없는 커스텀 유저(예: 네이버/카카오 연동)를 위해 필요합니다.

CREATE OR REPLACE FUNCTION log_credit_transaction_rpc(
    p_user_id TEXT,
    p_amount NUMERIC,
    p_type TEXT,
    p_related_type TEXT DEFAULT NULL,
    p_related_id TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- 이 함수는 작성자(관리자)의 권한으로 실행되므로 RLS를 우회합니다.
AS $$
BEGIN
    INSERT INTO public.credit_logs (
        user_id,
        amount,
        type,
        related_type,
        related_id,
        description,
        created_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_related_type,
        p_related_id,
        p_description,
        now()
    );
END;
$$;
