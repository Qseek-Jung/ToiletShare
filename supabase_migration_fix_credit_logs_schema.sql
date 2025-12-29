-- 1. credit_logs 테이블의 amount 컬럼을 정수형(integer)에서 숫자형(numeric)으로 변경
-- (0.8 같은 소수점 점수를 저장하기 위함)
ALTER TABLE public.credit_logs ALTER COLUMN amount TYPE numeric;

-- 2. credit_logs 테이블에 대한 INSERT 권한 정책(RLS) 수정
-- (기존 정책이 존재할 경우 삭제 후 재생성)
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.credit_logs;

-- "내 아이디(user_id)와 일치하는 데이터는 내가 직접 추가할 수 있다"는 규칙 추가
CREATE POLICY "Enable insert for users based on user_id" ON public.credit_logs
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);
