-- Supabase Edge Function: Admin Operations
-- This function handles admin-only operations like deleting users from auth.users
-- and syncing role changes to user metadata.

-- To deploy Edge Functions, you need to:
-- 1. Install Supabase CLI: npm install -g supabase
-- 2. Login: supabase login
-- 3. Link project: supabase link --project-ref YOUR_PROJECT_REF
-- 4. Deploy: supabase functions deploy admin-operations

-- IMPORTANT: Edge Functions require the Supabase project to be on a paid plan
-- for production use. For development, you can test locally.

-- The function expects a JSON body with:
-- { "action": "delete_user" | "update_role", "userId": "uuid", "role"?: "Admin" | "Premium" | "Reader" }

-- Example invocation from client:
-- const { data, error } = await supabase.functions.invoke('admin-operations', {
--   body: { action: 'delete_user', userId: 'user-uuid-here' }
-- });
