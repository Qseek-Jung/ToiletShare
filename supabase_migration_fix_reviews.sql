-- 1. credit_logs 테이블의 amount 컬럼을 소수점 지원(numeric)으로 변경
ALTER TABLE public.credit_logs ALTER COLUMN amount TYPE numeric;

-- 2. users 테이블의 activity_score 컬럼도 소수점 지원 확인 및 변경 (안전장치)
ALTER TABLE public.users ALTER COLUMN activity_score TYPE numeric;

-- 3. credit_logs 테이블에 대한 RLS 정책 수정 (UUID vs TEXT 형변환 해결)
-- auth.uid()는 UUID 타입, user_id 컬럼은 TEXT 타입이므로 형변환(::text)이 필요합니다.
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.credit_logs;

CREATE POLICY "Enable insert for users based on user_id" ON public.credit_logs
    FOR INSERT
    TO public
    WITH CHECK (auth.uid()::text = user_id);

-- 4. 읽기 권한 정책 (선택사항, 형변환 적용)
DROP POLICY IF EXISTS "Enable read for users based on user_id" ON public.credit_logs;

CREATE POLICY "Enable read for users based on user_id" ON public.credit_logs
    FOR SELECT
    TO public
    USING (auth.uid()::text = user_id);
