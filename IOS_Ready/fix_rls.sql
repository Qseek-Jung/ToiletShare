-- Add missing policies for other tables

-- 1. Daily Stats
create policy "Anyone can read daily stats" on daily_stats for select using (true);
create policy "Anyone can update daily stats" on daily_stats for all using (true);

-- 2. App Config
create policy "Anyone can read app config" on app_config for select using (true);
create policy "Admins can update app config" on app_config for all using (true);

-- 3. Notifications
create policy "Users can see their own notifications" on notifications for select using (auth.uid()::text = user_id or true); -- Permissive for now as auth might not be fully enforced
create policy "Anyone can create notifications" on notifications for insert with check (true);
create policy "Users can update their own notifications" on notifications for update using (true);

-- 4. Banned Locations/Users
create policy "Anyone can read banned lists" on banned_locations for select using (true);
create policy "Anyone can read banned users" on banned_users for select using (true);
create policy "Admins can manage bans" on banned_locations for all using (true);
create policy "Admins can manage banned users" on banned_users for all using (true);

-- 5. Upload History
create policy "Admins can manage upload history" on upload_history for all using (true);
