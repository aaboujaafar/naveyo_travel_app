/* eslint-disable import/no-unresolved -- Supabase Edge Functions resolve Deno URL imports at runtime. */
import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

export type AuthenticatedRequest = { client: SupabaseClient; user: User }

export async function requireAuthenticatedRequest(request: Request): Promise<AuthenticatedRequest> {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Response(JSON.stringify({ error: 'missing_authorization' }), { status: 401 })
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Response(JSON.stringify({ error: 'invalid_authorization' }), { status: 401 })
  return { client, user: data.user }
}

export async function requireTripMember(request: Request, tripId: string): Promise<AuthenticatedRequest> {
  const authenticated = await requireAuthenticatedRequest(request)
  const { data, error } = await authenticated.client.from('trip_members').select('role').eq('trip_id', tripId).eq('account_id', authenticated.user.id).maybeSingle()
  if (error || !data) throw new Response(JSON.stringify({ error: 'trip_membership_required' }), { status: 403 })
  return authenticated
}
