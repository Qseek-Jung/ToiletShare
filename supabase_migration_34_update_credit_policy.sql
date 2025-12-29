-- Update Credit Policy in app_config
-- You can modify the values below to change the credit system logic.
-- This will UPSERT (Insert or Update) the policy.

INSERT INTO public.app_config (key, value)
VALUES (
    'credit_policy',
    '{
        "signup": 10,
        "toiletSubmit": 50,
        "reviewSubmit": 10,
        "reportSubmit": 20,
        "passwordUpdate": 3,
        "adView": 1,
        "unlockCost": 5,
        "referralReward": 20,
        "ownerReviewReward": 1,
        "ownerUnlockReward": 1
    }'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET value = EXCLUDED.value;

-- Verify the update
SELECT * FROM public.app_config WHERE key = 'credit_policy';
