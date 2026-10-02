-- Fix: deleting a review only clawed back the ad bonus (when reviews.rewarded),
-- so write -> delete -> write could farm the base review reward.
-- Now the clawback equals everything paid for that review (base + ad bonus), once.

create or replace function public.review_reward_total(p_review_id text, p_user_id text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::int
    from public.credit_logs
   where related_type = 'review'
     and related_id = p_review_id
     and user_id = p_user_id
     and type in ('review_add', 'ad_view');
$$;
revoke all on function public.review_reward_total(text, text) from public, anon, authenticated;

-- Author deletes own review (call BEFORE deleting the row)
create or replace function public.rpc_review_delete_penalty(p_review_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := public.require_app_user();
  v_amount int;
  v_credits int;
begin
  if not exists (select 1 from public.reviews where id::text = p_review_id and user_id = v_uid) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;
  perform 1 from public.users where id = v_uid for update;
  if exists (select 1 from public.credit_logs
              where type = 'review_delete_penalty' and related_id = p_review_id) then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;

  v_amount := public.review_reward_total(p_review_id, v_uid);
  if v_amount <= 0 then
    return jsonb_build_object('credits', (select credits from public.users where id = v_uid), 'amount', 0);
  end if;

  v_credits := public.apply_credit(v_uid, -v_amount, 'review_delete_penalty', 'review', p_review_id, '리뷰 삭제 회수');
  return jsonb_build_object('credits', v_credits, 'amount', -v_amount);
end;
$$;

-- Admin deletes someone's review
create or replace function public.rpc_admin_review_clawback(p_review_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author text;
  v_amount int;
begin
  if not public.is_app_admin() then
    raise exception 'forbidden';
  end if;
  select user_id into v_author from public.reviews where id::text = p_review_id;
  if not found or v_author is null then
    return jsonb_build_object('amount', 0);
  end if;
  if exists (select 1 from public.credit_logs where type = 'review_delete_penalty' and related_id = p_review_id) then
    return jsonb_build_object('amount', 0);
  end if;
  v_amount := public.review_reward_total(p_review_id, v_author);
  if v_amount <= 0 then
    return jsonb_build_object('amount', 0);
  end if;
  perform public.apply_credit(v_author, -v_amount, 'review_delete_penalty', 'review', p_review_id, '관리자 리뷰 삭제 회수');
  return jsonb_build_object('amount', -v_amount);
end;
$$;
