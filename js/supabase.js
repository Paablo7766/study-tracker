import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

/** @type {'synced' | 'syncing' | 'offline' | 'error' | 'disabled'} */
let syncStatus = 'disabled';

const statusListeners = new Set();

const PLACEHOLDER_URL = 'TU-PROYECTO';
const PLACEHOLDER_KEY = 'tu-anon-key';

export function isSupabaseConfigured() {
  const url = String(SUPABASE_URL || '').trim();
  const key = String(SUPABASE_ANON_KEY || '').trim();
  return (
    Boolean(url && key) &&
    !url.includes(PLACEHOLDER_URL) &&
    key !== PLACEHOLDER_KEY
  );
}

export function getSyncStatus() {
  return syncStatus;
}

/** @param {(status: typeof syncStatus) => void} fn */
export function onSyncStatusChange(fn) {
  statusListeners.add(fn);
  fn(syncStatus);
  return () => statusListeners.delete(fn);
}

/** @param {typeof syncStatus} status */
export function setSyncStatus(status) {
  syncStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

export async function initSupabase() {
  if (!isSupabaseConfigured()) {
    setSyncStatus('disabled');
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export async function ensureSession() {
  const sb = await initSupabase();
  if (!sb) return null;

  const { data: { session } } = await sb.auth.getSession();
  if (session) return session;

  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    if (error.message?.includes('Anonymous sign-ins are disabled') || error.code === 'anonymous_provider_disabled') {
      throw new Error('Auth anónima desactivada en Supabase. Actívala en Authentication → Providers → Anonymous sign-ins.');
    }
    throw error;
  }
  return data.session;
}

/**
 * @returns {Promise<{ subjects: unknown[]; sessions: unknown[]; settings: Record<string, unknown>; updated_at: string } | null>}
 */
export async function pullRemoteData() {
  const sb = await initSupabase();
  if (!sb) return null;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from('user_data')
    .select('subjects, sessions, settings, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * @param {{ subjects: unknown[]; sessions: unknown[]; settings: Record<string, unknown> }} payload
 */
export async function pushRemoteData(payload) {
  const sb = await initSupabase();
  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('No hay sesión de Supabase');

  const { error } = await sb.from('user_data').upsert({
    user_id: user.id,
    subjects: payload.subjects,
    sessions: payload.sessions,
    settings: payload.settings,
    updated_at: new Date().toISOString()
  });

  if (error) throw error;
}

export async function deleteRemoteData() {
  const sb = await initSupabase();
  if (!sb) return;

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { error } = await sb.from('user_data').delete().eq('user_id', user.id);
  if (error) throw error;
}
