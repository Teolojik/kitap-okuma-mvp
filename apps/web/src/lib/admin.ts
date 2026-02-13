import type { User } from '@supabase/supabase-js';

/**
 * Centralized admin authorization.
 * Admin emails are NOT hardcoded in components — they are defined here.
 * For production, consider moving these to Supabase `profiles.role` or env vars.
 */
const ADMIN_EMAILS: string[] = [
    'support@epigraph.app',
    'blocking_saxsafon@hotmail.com',
];

export function isAdmin(user: User | null): boolean {
    if (!user) return false;
    if (user.user_metadata?.role === 'admin') return true;
    return ADMIN_EMAILS.includes(user.email || '');
}
