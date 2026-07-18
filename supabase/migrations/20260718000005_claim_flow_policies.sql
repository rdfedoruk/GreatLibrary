-- Claim flow (2026-07-18): lets a claimed profile owner add identity
-- evidence to their own page, and lets any signed-in user request a claim
-- on an unclaimed page. Approval itself stays manual SQL — no admin role
-- exists yet (docs/todo.md § Administrata), deliberately not built here.

create policy "users can add identities to their own profile"
  on public.profile_identities for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.linked_user_id = auth.uid()
    )
  );

create policy "users can remove identities from their own profile"
  on public.profile_identities for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.linked_user_id = auth.uid()
    )
  );
