-- Step 2 of RLS hardening: server-side credit / unlock / admin operations.
-- Amounts come from app_config.credit_policy, balances are changed atomically,
-- and every function derives the caller from the Supabase Auth session.
-- Additive only: legacy client paths keep working until step 3.

-- ---------------------------------------------------------------------------
-- Helpers (not callable by clients)
-- ---------------------------------------------------------------------------
create or replace function public.credit_policy_int(p_key text, p_default int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value ->> p_key)::int from public.app_config where key = 'credit_policy'),
    p_default
  );
$$;

create or replace function public.apply_credit(
  p_user_id text,
  p_amount int,
  p_type text,
  p_related_type text default null,
  p_related_id text default null,
  p_description text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits int;
begin
  update public.users
     set credits = coalesce(credits, 0) + p_amount
   where id = p_user_id
  returning credits into v_credits;

  if not found then
    raise exception 'user_not_found';
  end if;

  if p_amount <> 0 then
    insert into public.credit_logs (user_id, amount, type, related_type, related_id, description)
    values (p_user_id, p_amount, p_type, p_related_type, p_related_id, p_description);
  end if;

  return v_credits;
end;
$$;

create or replace function public.require_app_user()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id text := public.current_app_user_id();
begin
  if v_id is null then
    raise exception 'not_authenticated';
  end if;
  return v_id;
end;
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where auth_id = auth.uid() and lower(role) = 'admin'
  );
$$;

revoke all on function public.credit_policy_int(text, int) from public, anon, authenticated;
revoke all on function public.apply_credit(text, int, text, text, text, text) from public, anon, authenticated;
revoke all on function public.require_app_user() from public, anon, authenticated;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- User operations
-- ---------------------------------------------------------------------------

-- Unlock a toilet password. Admin/VIP/owner unlock for free.
-- p_via_ad: user watched an ad instead of paying (net = adView - unlockCost).
create or replace function public.rpc_unlock_toilet(p_toilet_id text, p_via_ad boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_role text;
  v_credits int;
  v_owner text;
  v_name text;
  v_cost int := public.credit_policy_int('unlockCost', 5);
  v_ad int := public.credit_policy_int('adView', 1);
  v_owner_reward int := public.credit_policy_int('ownerUnlockReward', 1);
begin
  select created_by, name into v_owner, v_name from public.toilets where id::text = p_toilet_id;
  if not found then
    raise exception 'toilet_not_found';
  end if;

  select lower(role), coalesce(credits, 0) into v_role, v_credits
    from public.users where id = v_uid for update;

  if v_role in ('admin', 'vip') or v_owner = v_uid then
    return jsonb_build_object('credits', v_credits, 'charged', 0);
  end if;

  if p_via_ad then
    perform public.apply_credit(v_uid, v_ad, 'ad_view', 'toilet', p_toilet_id, '광고 시청 보상');
    v_credits := public.apply_credit(v_uid, -v_cost, 'toilet_unlock', 'toilet', p_toilet_id, '화장실 열람 (광고 대체)');
  else
    if v_credits < v_cost then
      raise exception 'insufficient_credits';
    end if;
    v_credits := public.apply_credit(v_uid, -v_cost, 'toilet_unlock', 'toilet', p_toilet_id, '화장실 비밀번호 열람');
  end if;

  if v_owner is not null and v_owner <> v_uid and v_owner_reward > 0 then
    perform public.apply_credit(v_owner, v_owner_reward, 'toilet_unlock', 'toilet', p_toilet_id,
                                '내 화장실(' || coalesce(v_name, '') || ') 열람 보상');
  end if;

  return jsonb_build_object('credits', v_credits, 'charged', v_cost);
end;
$$;

-- Credit for watching an ad on My Page (daily cap: policy adDailyLimit, default 50).
create or replace function public.rpc_ad_reward()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int := public.credit_policy_int('adView', 1);
  v_limit int := public.credit_policy_int('adDailyLimit', 50);
  v_today int;
  v_credits int;
begin
  select count(*) into v_today from public.credit_logs
   where user_id = v_uid and type = 'ad_view' and related_type = 'none'
     and created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
  if v_today >= v_limit then
    raise exception 'daily_limit_reached';
  end if;

  v_credits := public.apply_credit(v_uid, v_amount, 'ad_view', 'none', null, '마이페이지 광고 적립');
  return jsonb_build_object('credits', v_credits, 'amount', v_amount);
end;
$$;

-- Reward for registering a toilet (once per toilet, creator only).
create or replace function public.rpc_reward_toilet_submit(p_toilet_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int := public.credit_policy_int('toiletSubmit', 50);
  v_credits int;
begin
  if not exists (select 1 from public.toilets where id::text = p_toilet_id and created_by = v_uid) then
    raise exception 'not_owner';
  end if;
  perform 1 from public.users where id = v_uid for update;
  if exists (select 1 from public.credit_logs where type = 'toilet_add' and related_id = p_toilet_id) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;
  v_credits := public.apply_credit(v_uid, v_amount, 'toilet_add', 'toilet', p_toilet_id, '화장실 등록 보상');
  return jsonb_build_object('credits', v_credits, 'amount', v_amount);
end;
$$;

-- Review rewards. p_ad_bonus=false: base reward on submit; true: extra reward after watching an ad.
-- Each kind is paid once per review, author only.
create or replace function public.rpc_reward_review(p_review_id text, p_ad_bonus boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int := public.credit_policy_int('reviewSubmit', 10);
  v_type text := case when p_ad_bonus then 'ad_view' else 'review_add' end;
  v_credits int;
begin
  if not exists (select 1 from public.reviews where id::text = p_review_id and user_id = v_uid) then
    raise exception 'not_owner';
  end if;
  perform 1 from public.users where id = v_uid for update;
  if exists (select 1 from public.credit_logs
              where type = v_type and related_type = 'review' and related_id = p_review_id) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;

  v_credits := public.apply_credit(v_uid, v_amount, v_type, 'review', p_review_id,
                                   case when p_ad_bonus then '리뷰 작성 보상 (광고)' else '리뷰 작성 보상' end);
  if p_ad_bonus then
    update public.reviews set rewarded = true where id::text = p_review_id;
  end if;
  return jsonb_build_object('credits', v_credits, 'amount', v_amount);
end;
$$;

-- Referral: the current (new) user names a referrer; paid once per new user.
create or replace function public.rpc_process_referral(p_referrer_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int := public.credit_policy_int('referralReward', 20);
begin
  if p_referrer_id is null or p_referrer_id = v_uid then
    return jsonb_build_object('rewarded', false);
  end if;
  if not exists (select 1 from public.users where id = p_referrer_id) then
    return jsonb_build_object('rewarded', false);
  end if;

  update public.users set referrer_id = p_referrer_id
   where id = v_uid and referrer_id is null;
  if not found then
    return jsonb_build_object('rewarded', false);
  end if;

  perform public.apply_credit(p_referrer_id, v_amount, 'signup', 'user', v_uid, '친구 초대 보상');
  return jsonb_build_object('rewarded', true, 'amount', v_amount);
end;
$$;

-- Fixed-amount adjustments triggered by the user's own toilet edits.
create or replace function public.rpc_toilet_share_change(p_toilet_id text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_credits int;
begin
  if p_kind = 'share_reward' then
    if not exists (select 1 from public.toilets where id::text = p_toilet_id and created_by = v_uid) then
      raise exception 'not_owner';
    end if;
    if exists (select 1 from public.credit_logs where type = 'toilet_share_reward' and related_id = p_toilet_id) then
      return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
    end if;
    v_credits := public.apply_credit(v_uid, 5, 'toilet_share_reward', 'toilet', p_toilet_id, '공유하기 변경 보상');
    return jsonb_build_object('credits', v_credits, 'amount', 5);
  elsif p_kind = 'delete_penalty' then
    v_credits := public.apply_credit(v_uid, -5, 'toilet_delete_penalty', 'toilet', p_toilet_id, '공유 화장실 삭제 페널티');
    return jsonb_build_object('credits', v_credits, 'amount', -5);
  end if;
  raise exception 'invalid_kind';
end;
$$;

-- Clawback when the author deletes a rewarded review.
create or replace function public.rpc_review_delete_penalty(p_review_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int := public.credit_policy_int('reviewSubmit', 10);
  v_credits int;
begin
  -- Must be called BEFORE the review row is deleted
  if not exists (select 1 from public.reviews
                  where id::text = p_review_id and user_id = v_uid and coalesce(rewarded, false)) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;
  if exists (select 1 from public.credit_logs
              where type = 'review_delete_penalty' and related_id = p_review_id) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;
  v_credits := public.apply_credit(v_uid, -v_amount, 'review_delete_penalty', 'review', p_review_id, '리뷰 삭제 회수');
  return jsonb_build_object('credits', v_credits, 'amount', -v_amount);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin operations
-- ---------------------------------------------------------------------------
create or replace function public.rpc_admin_adjust_credits(p_user_id text, p_amount int, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credits int;
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  v_credits := public.apply_credit(p_user_id, p_amount, 'admin_adjust', 'admin', public.current_app_user_id(),
                                   coalesce(p_reason, '관리자 지급'));
  return jsonb_build_object('credits', v_credits);
end;
$$;

create or replace function public.rpc_admin_approve_report(p_report_id text, p_custom_credit int default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter text;
  v_status text;
  v_amount int := coalesce(p_custom_credit, public.credit_policy_int('reportSubmit', 20));
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;

  select reporter_id, status into v_reporter, v_status from public.reports where id::text = p_report_id for update;
  if not found then
    raise exception 'report_not_found';
  end if;
  if v_status = 'resolved' then
    return jsonb_build_object('reporterId', v_reporter, 'amount', 0, 'alreadyResolved', true);
  end if;

  update public.reports set status = 'resolved' where id::text = p_report_id;
  if v_reporter is not null and v_amount <> 0 then
    perform public.apply_credit(v_reporter, v_amount, 'report_reward', 'report', p_report_id, '신고 보상 지급');
  end if;
  return jsonb_build_object('reporterId', v_reporter, 'amount', v_amount, 'alreadyResolved', false);
end;
$$;

create or replace function public.rpc_admin_set_role(p_user_id text, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  if lower(p_role) not in ('user', 'vip', 'admin') then
    raise exception 'invalid_role';
  end if;
  update public.users set role = lower(p_role) where id = p_user_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.rpc_admin_review_clawback(p_review_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author text;
  v_rewarded boolean;
  v_amount int := public.credit_policy_int('reviewSubmit', 10);
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  select user_id, coalesce(rewarded, false) into v_author, v_rewarded from public.reviews where id::text = p_review_id;
  if not found or not v_rewarded or v_author is null then
    return jsonb_build_object('amount', 0);
  end if;
  if exists (select 1 from public.credit_logs where type = 'review_delete_penalty' and related_id = p_review_id) then
    return jsonb_build_object('amount', 0);
  end if;
  perform public.apply_credit(v_author, -v_amount, 'review_delete_penalty', 'review', p_review_id, '관리자 리뷰 삭제 회수');
  return jsonb_build_object('amount', -v_amount);
end;
$$;

-- Client-callable functions: authenticated sessions only
revoke all on function public.rpc_unlock_toilet(text, boolean) from public, anon;
revoke all on function public.rpc_ad_reward() from public, anon;
revoke all on function public.rpc_reward_toilet_submit(text) from public, anon;
revoke all on function public.rpc_reward_review(text, boolean) from public, anon;
revoke all on function public.rpc_process_referral(text) from public, anon;
revoke all on function public.rpc_toilet_share_change(text, text) from public, anon;
revoke all on function public.rpc_review_delete_penalty(text) from public, anon;
revoke all on function public.rpc_admin_adjust_credits(text, int, text) from public, anon;
revoke all on function public.rpc_admin_approve_report(text, int) from public, anon;
revoke all on function public.rpc_admin_set_role(text, text) from public, anon;
revoke all on function public.rpc_admin_review_clawback(text) from public, anon;

grant execute on function public.rpc_unlock_toilet(text, boolean) to authenticated;
grant execute on function public.rpc_ad_reward() to authenticated;
grant execute on function public.rpc_reward_toilet_submit(text) to authenticated;
grant execute on function public.rpc_reward_review(text, boolean) to authenticated;
grant execute on function public.rpc_process_referral(text) to authenticated;
grant execute on function public.rpc_toilet_share_change(text, text) to authenticated;
grant execute on function public.rpc_review_delete_penalty(text) to authenticated;
grant execute on function public.rpc_admin_adjust_credits(text, int, text) to authenticated;
grant execute on function public.rpc_admin_approve_report(text, int) to authenticated;
grant execute on function public.rpc_admin_set_role(text, text) to authenticated;
grant execute on function public.rpc_admin_review_clawback(text) to authenticated;
