// Verifies that the caller actually controls a YouTube channel, and records
// it as a verified identity on their profile.
//
// Why this runs on the server: the whole point of a verified identity is
// that the user can't forge it. If the browser called YouTube and then wrote
// verified=true itself, anyone could skip the YouTube part and write the row
// directly. So the YouTube call happens here, and only this function (via
// the service role key) can set verified=true — RLS blocks everyone else.
//
// The user never types a channel. They sign in to it with Google; we ask
// YouTube "which channel does this token own?" and store the answer.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Not signed in.' }, 401)

    const { providerToken } = await req.json()
    if (!providerToken) return json({ error: 'Missing Google token.' }, 400)

    // Who is calling? Verified against Supabase Auth, not taken on trust.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'Not signed in.' }, 401)

    // Ask YouTube which channel this Google token actually owns.
    const ytRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true',
      { headers: { Authorization: `Bearer ${providerToken}` } },
    )
    if (!ytRes.ok) {
      return json(
        { error: 'Google would not confirm the channel. Try connecting again.' },
        400,
      )
    }
    const yt = await ytRes.json()
    const channel = yt.items?.[0]
    if (!channel) {
      return json({ error: 'That Google account has no YouTube channel.' }, 400)
    }

    // Store the handle form (youtube.com/@name) because that's what YouTube's
    // oEmbed returns as author_url, which is what content matching compares
    // against. Channels without a handle fall back to the /channel/ID form.
    const handle: string | undefined = channel.snippet?.customUrl
    const identityValue = handle
      ? `https://www.youtube.com/${handle.startsWith('@') ? handle : '@' + handle}`
      : `https://www.youtube.com/channel/${channel.id}`

    // Service role: the only path allowed to set verified = true.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id')
      .eq('linked_user_id', userData.user.id)
      .single()
    if (profileError || !profile) return json({ error: 'No profile found.' }, 400)

    // Someone else may already have this channel verified — that's a real
    // conflict and the unique index would reject it anyway.
    const { data: existing } = await admin
      .from('profile_identities')
      .select('id, profile_id')
      .eq('platform', 'youtube')
      .eq('identity_value', identityValue)
      .eq('verified', true)
      .maybeSingle()
    if (existing && existing.profile_id !== profile.id) {
      return json({ error: 'That channel is already verified by someone else.' }, 409)
    }

    // Replace any unverified assertion of this channel on this profile,
    // then write the verified row.
    await admin
      .from('profile_identities')
      .delete()
      .eq('profile_id', profile.id)
      .eq('platform', 'youtube')
      .eq('identity_value', identityValue)
      .eq('verified', false)

    if (!existing) {
      const { error: insertError } = await admin
        .from('profile_identities')
        .insert({
          profile_id: profile.id,
          platform: 'youtube',
          identity_value: identityValue,
          verified: true,
          verified_at: new Date().toISOString(),
        })
      if (insertError) return json({ error: insertError.message }, 400)
    }

    return json({
      verified: true,
      channel: identityValue,
      title: channel.snippet?.title ?? null,
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
