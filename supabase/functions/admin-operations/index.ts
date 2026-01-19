// Supabase Edge Function: Admin Operations
// Handles privileged admin actions that require service_role key
// - Delete user from auth.users
// - Update user role in user metadata

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create admin client with service_role key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Verify caller is an admin
        const authHeader = req.headers.get('Authorization')!
        const token = authHeader.replace('Bearer ', '')

        const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (authError || !caller) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Check if caller is admin
        const { data: callerProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single()

        if (callerProfile?.role !== 'Admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Parse request body
        const { action, userId, role } = await req.json()

        if (action === 'delete_user') {
            // 1. Delete from auth.users (this cascades to profiles if FK is set)
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

            if (deleteError) {
                throw deleteError
            }

            return new Response(JSON.stringify({ success: true, message: 'User deleted from auth system' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'update_role') {
            if (!role) {
                return new Response(JSON.stringify({ error: 'Role is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // Update user metadata with new role
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { role }
            })

            if (updateError) {
                throw updateError
            }

            return new Response(JSON.stringify({ success: true, message: 'Role updated in auth metadata' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Admin operation error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
