# Deployment

How code and schema changes reach the live site, and the traps that made
each one look impossible the first time.

Everything here can be done without opening a dashboard. Credentials live
in `.env`, which is gitignored — see `.env.example` for what belongs there.

## The pieces

| Thing | Where it lives |
|---|---|
| Code | GitHub `main` → Vercel builds → greatlibrary.theduke.digital |
| Database | Supabase project `vjwvswsuzhcqrkwpqodg` (GreatLibrary), region ca-central-1 |
| Test database | Supabase project `ayaaqjdkabwivwhewmvo` (GreatLibraryTesting), region us-west-2 |

Vercel builds a preview for every pushed branch and rebuilds production
only when something lands on `main`.

## Order matters: schema first, then code

Push the migration to production **before** merging the code that needs
it. The live site ignores a column it doesn't know about, so schema-ahead
is harmless. Code-ahead is an outage — the app queries a column that
isn't there and the feature fails with a 400.

**That only holds for changes that add things.** A migration that removes
or renames a column the live code still reads breaks the live site the
moment it is applied — on 2026-11-16 dropping `tags.dimension` took the
live feed down until the new code merged. For those, have the pull request
open and ready first, apply the migration, and merge straight away.

## Pushing a migration to production

```
set -a; . ./.env; set +a
npx supabase db push --db-url "$PROD_DB_URL" --include-all --yes
```

Three things will each make this look like a Supabase fault when it
isn't:

- **`db.<ref>.supabase.co` resolves to IPv6 only.** On a machine with no
  IPv6 route the CLI reports `no such host`, which reads like a wrong
  hostname. Use the pooler host instead.
- **The pooler generation prefix differs per project.** GreatLibrary is
  `aws-0`, the newer test project is `aws-1`. The wrong one gives
  `FATAL: tenant/user not found`, which reads like a bad password.
- **The region differs per project too**, and is not guessable. Get both
  it and the ref from `npx supabase projects list`.

A VPN silently stalls port-5432 connections while leaving ordinary web
traffic working, so the failure looks like Supabase being down (`tls error
... i/o timeout`). Swap `:5432` for `:6543` in the address and push again —
that port gets through the VPN (worked 2026-11-16). Failing that, turn the
VPN off, push, turn it back on.

The CLI also prints a long Docker warning about a "migrations catalog".
Ignore it; the line that matters is `Finished supabase db push`.

## Changing auth settings

Use the Management API with `SUPABASE_ACCESS_TOKEN`:

```
curl https://api.supabase.com/v1/projects/vjwvswsuzhcqrkwpqodg/config/auth \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

**Never run `supabase config push` against production.** It overwrites
the entire `[auth]` block from `config.toml`, whose `site_url` is still
the CLI's local-dev default (`http://127.0.0.1:3000`). That would break
sign-in for everyone. Always GET the current config and PATCH only the
field you're changing.

### Redirect URLs

Supabase only honours a redirect URL that's on the allow-list, and
silently falls back to `site_url` otherwise. The symptom is signing in
locally and landing on the live site. Any new address that needs
sign-in — a local dev port, a Vercel preview — has to be added:

```
curl -X PATCH https://api.supabase.com/v1/projects/vjwvswsuzhcqrkwpqodg/config/auth \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uri_allow_list":"<existing entries>,<new one>/**"}'
```

`site_url` stays `https://greatlibrary.theduke.digital`. Don't change it.

## Shipping code

```
git push -u origin <branch>
gh pr create --base main --head <branch>
gh pr merge <n> --merge
```

`gh` may report itself logged out while `git push` works, because they
use different stored credentials. Git's own credential helper has a
usable token:

```
export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' \
  | git credential fill | sed -n 's/^password=//p')
```

Confirm a deploy actually landed rather than trusting the merge — check
the deployment status for the merge commit, then that the live bundle
contains the new code:

```
curl -s https://greatlibrary.theduke.digital | grep -o '/assets/index-[A-Za-z0-9_-]*\.js'
```

## Previews use the production database

A Vercel preview reads and writes the real Supabase project. Anything
posted while testing a preview is real data that appears on the live site
once the code merges. Delete test rows afterwards.
