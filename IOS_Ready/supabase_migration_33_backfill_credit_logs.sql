-- Backfill credit_logs based on existing data
-- This helps populate the Credit Statistics charts immediately.

-- 1. Backfill Signup Rewards (10 credits per user)
insert into credit_logs (user_id, amount, type, description, created_at)
select 
    id, 
    10, 
    'signup', 
    '회원가입 환영 보상 (Backfill)', 
    created_at
from users
where not exists (
    select 1 from credit_logs where credit_logs.user_id = users.id and credit_logs.type = 'signup'
);

-- 2. Backfill Review Rewards (10 credits per review)
insert into credit_logs (user_id, amount, type, related_type, related_id, description, created_at)
select 
    user_id, 
    10, 
    'review_add', 
    'review', 
    id, 
    '리뷰 작성 보상 (Backfill)', 
    created_at
from reviews
where not exists (
    select 1 from credit_logs where credit_logs.related_id = reviews.id::text and credit_logs.type = 'review_add'
);

-- 3. Backfill Toilet Registration Rewards (50 credits)
insert into credit_logs (user_id, amount, type, related_type, related_id, description, created_at)
select 
    created_by, 
    50, 
    'toilet_register', 
    'toilet', 
    id, 
    '화장실 등록 보상 (Backfill)', 
    created_at
from toilets
where created_by is not null
and not exists (
    select 1 from credit_logs where credit_logs.related_id = toilets.id::text and credit_logs.type = 'toilet_register'
);
