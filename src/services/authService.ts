import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { AdminUser } from '../types';

export const ADMIN_CREDENTIALS = {
  username: 'goodzeed-admin',
  password: 'cAK9-Sxo3LfyKLhoe'
};

const ADMIN_SESSION_KEY = 'goodzeed_admin_session';
const ADMIN_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const getAdminSession = (): AdminUser | null => {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session?.expiresAt && new Date(session.expiresAt) > new Date()) {
      return session;
    }
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  } catch {
    return null;
  }
};

export const saveAdminSession = (user: AdminUser): void => {
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
  } catch {}
};

export const clearAdminSession = (): void => {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {}
};

/**
 * Ensures that the client has a valid Supabase Auth session for admin uploads.
 * If the session is missing or expired, it authenticates using the verified store admin credentials.
 */
export const ensureAdminSupabaseAuth = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@goodzeed.com.bd',
      password: ADMIN_CREDENTIALS.password
    });
    return !!data.session && !error;
  } catch (err) {
    console.warn('[authService] ensureAdminSupabaseAuth error:', err);
    return false;
  }
};

export const loginAdmin = async (
  emailOrUsername: string,
  pass: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> => {
  const cleanUser = (emailOrUsername || '').trim();
  const cleanPass = (pass || '').trim();

  // 1. If Supabase is configured, use Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const authEmail = (cleanUser === ADMIN_CREDENTIALS.username || cleanUser === 'goodzeed-admin')
        ? 'admin@goodzeed.com.bd'
        : cleanUser;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: cleanPass
      });

      if (error || !data.user) {
        // Fallback check against ADMIN_CREDENTIALS during migration if email doesn't match
        if (cleanUser === ADMIN_CREDENTIALS.username && cleanPass === ADMIN_CREDENTIALS.password) {
          const sessionToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS).toISOString();
          const user: AdminUser = {
            id: 'admin-001',
            email: 'admin@goodzeed.com.bd',
            name: 'GoodZeed Administrator',
            role: 'SUPER_ADMIN',
            lastLoginAt: new Date().toISOString(),
            sessionToken,
            expiresAt
          };
          saveAdminSession(user);
          return { success: true, user };
        }
        return { success: false, error: error?.message || 'Invalid credentials' };
      }

      // Check admin_users table for active role
      const { data: profile } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const sessionToken = data.session?.access_token || crypto.randomUUID();
      const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS).toISOString();

      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email || cleanUser,
        name: profile?.name || data.user.user_metadata?.name || 'Store Administrator',
        role: profile?.role || 'SUPER_ADMIN',
        lastLoginAt: new Date().toISOString(),
        sessionToken,
        expiresAt
      };

      // Update last_login_at
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      saveAdminSession(adminUser);
      return { success: true, user: adminUser };
    } catch (err: any) {
      console.warn('[authService] Supabase auth error, falling back to local gate:', err);
    }
  }

  // 2. Fallback client-side gate (when Supabase credentials are placeholder)
  if (cleanUser === ADMIN_CREDENTIALS.username && cleanPass === ADMIN_CREDENTIALS.password) {
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_DURATION_MS).toISOString();
    const user: AdminUser = {
      id: 'admin-001',
      email: 'admin@goodzeed.com.bd',
      name: 'GoodZeed Administrator',
      role: 'SUPER_ADMIN',
      lastLoginAt: new Date().toISOString(),
      sessionToken,
      expiresAt
    };
    saveAdminSession(user);
    return { success: true, user };
  }

  return { success: false, error: 'Invalid admin credentials' };
};

export const logoutAdmin = async (): Promise<void> => {
  clearAdminSession();
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[authService] Error signing out:', err);
    }
  }
};
