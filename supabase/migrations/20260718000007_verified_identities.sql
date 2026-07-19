-- Verified identities (2026-07-18). Typing "this YouTube channel is mine"
-- proves nothing — anyone could type someone else's channel and pull their
-- content onto their own page. So identities now carry a verified flag, and
-- only verified ones have any power.
--
-- Verification is set ONLY by the verify-youtube Edge Function using the
-- service role key: the user signs in to the channel via Google and the
-- function reads the channel back from YouTube. Users cannot set this
-- themselves (see the with-check on the insert policy below), because a
-- client-side check would be trivially forgeable and a badge that means
-- nothing is worse than no badge.

alter table public.profile_identities
  add column verified boolean not null default false,
  add column verified_at timestamptz;

-- Only a *verified* identity locks a platform account. The old blanket
-- unique constraint let a squatter type someone else's channel and
-- permanently block the real owner from ever proving it.
alter table public.profile_identities
  drop constraint profile_identities_platform_identity_value_key;

create unique index profile_identities_verified_unique
  on public.profile_identities (platform, identity_value)
  where verified;

-- Users may still add unverified (asserted) identities to their own
-- profile, but may never mark one verified.
drop policy "users can add identities to their own profile" on public.profile_identities;

create policy "users can add unverified identities to their own profile"
  on public.profile_identities for insert
  with check (
    verified = false
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.linked_user_id = auth.uid()
    )
  );

-- Self-attribution now requires having proven at least one identity. This
-- is what closes the typed-channel hole: asserting a channel gets you
-- nothing until the platform vouches for you.
drop policy "claimed profiles can attribute themselves to any submission"
  on public.submission_attributions;

create policy "profiles with a verified identity can attribute themselves"
  on public.submission_attributions for insert
  with check (
    exists (
      select 1
      from public.profiles p
      join public.profile_identities pi on pi.profile_id = p.id
      where p.id = profile_id
        and p.linked_user_id = auth.uid()
        and pi.verified
    )
  );
