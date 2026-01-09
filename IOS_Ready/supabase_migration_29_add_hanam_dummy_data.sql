-- Generates 150 dummy toilets in Hanam-si Deokpung-dong
-- Target: 50 Admin, 50 User (Open), 50 User (Locked)
-- Fix: Handles "Foreign Key Violation" by prioritizing EXISTING valid users.
-- Fix 2: If creating new user, populates ALL required columns.

DO $$
DECLARE
    v_user_id UUID;
    base_lat FLOAT := 37.543;
    base_lng FLOAT := 127.214;
    i INT;
BEGIN
    -------------------------------------------------------
    -- 1. Secure a Valid User ID (UUID) for Foreign Key
    -------------------------------------------------------
    
    -- Attempt 1: Find ANY user who has already created a toilet (Proven Valid ID)
    BEGIN
        SELECT created_by INTO v_user_id 
        FROM toilets 
        WHERE created_by IS NOT NULL 
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Attempt 2: If no existing creator, try auth.users
    IF v_user_id IS NULL THEN
        BEGIN
            SELECT id INTO v_user_id FROM auth.users LIMIT 1;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    -- Attempt 3: Public Users (Valid UUID only)
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id 
        FROM public.users 
        WHERE id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        LIMIT 1;
    END IF;

    -- Attempt 4: MUST Create a Dummy User (Robust Insert)
    IF v_user_id IS NULL THEN
        v_user_id := gen_random_uuid();
        
        RAISE NOTICE 'Creating new dummy user: %', v_user_id;
        
        -- Insert with ALL likely required fields to avoid Not-Null constraints
        BEGIN
            INSERT INTO public.users (
                id, nickname, email, role, created_at,
                gender, status, credits, notification_enabled
            )
            VALUES (
                v_user_id, 'AdminBot', 'admin@bot.com', 'ADMIN', NOW(),
                'UNI', 'ACTIVE', 0, true
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to insert dummy user: %', SQLERRM;
            -- If this fails, the script will likely crash next, but at least we see why.
        END;
    END IF;

    RAISE NOTICE 'Using User ID: %', v_user_id;

    -------------------------------------------------------
    -- 2. Generate Toilets (With Explicit ID Generation)
    -------------------------------------------------------

    -- 2.1 Create 50 Admin Toilets
    FOR i IN 1..50 LOOP
        INSERT INTO toilets (
            id, name, address, lat, lng, type, gender_type, 
            has_password, is_unlocked, cleanliness, has_bidet, has_paper, 
            source, created_by, created_at
        ) VALUES (
            gen_random_uuid(),
            '하남 공공화장실 ' || i,
            '경기도 하남시 덕풍동 산 ' || i,
            base_lat + (random() * 0.01 - 0.005), 
            base_lng + (random() * 0.01 - 0.005),
            'Public', 'uni',
            false, true, 5, true, true,
            'admin', v_user_id,
            NOW() - (random() * interval '30 days')
        );
    END LOOP;

    -- 2.2 Create 50 User Toilets (Open)
    FOR i IN 1..50 LOOP
        INSERT INTO toilets (
            id, name, address, lat, lng, type, gender_type, 
            has_password, is_unlocked, cleanliness, has_bidet, has_paper, 
            source, created_by, created_at
        ) VALUES (
            gen_random_uuid(),
            '덕풍 공유화장실 ' || i,
            '경기도 하남시 덕풍동 ' || (100+i) || '번지',
            base_lat + (random() * 0.01 - 0.005),
            base_lng + (random() * 0.01 - 0.005),
            'Commercial', 'male',
            false, true, 4, false, true,
            'user', v_user_id,
            NOW() - (random() * interval '60 days')
        );
    END LOOP;

    -- 2.3 Create 50 User Toilets (Locked)
    FOR i IN 1..50 LOOP
        INSERT INTO toilets (
            id, name, address, lat, lng, type, gender_type, 
            has_password, password, is_unlocked, cleanliness, has_bidet, has_paper, 
            source, created_by, created_at
        ) VALUES (
            gen_random_uuid(),
            '덕풍 비공개 화장실 ' || i,
            '경기도 하남시 덕풍동 ' || (500+i) || '번지',
            base_lat + (random() * 0.01 - 0.005),
            base_lng + (random() * 0.01 - 0.005),
            'Commercial', 'female',
            true, '1234', false, 3, true, false,
            'user', v_user_id,
            NOW() - (random() * interval '90 days')
        );
    END LOOP;

    RAISE NOTICE 'Success: 150 Toilets Created in Hanam-si';
END $$;
