import './privacy.css'

// Written to match what the site actually stores. If sign-in starts asking
// for more, or a new outside service is added, this page needs updating.
// Says "this site" rather than the name, which is still a working title.
const CONTACT_EMAIL = 'privacy@theduke.digital'
const LAST_UPDATED = '17 November 2026'

export function PrivacyPage() {
  return (
    <article className="privacy">
      <h2>Privacy</h2>
      <p className="privacy-updated">Last updated {LAST_UPDATED}</p>

      <p>
        This site is a community catalogue of ServiceNow content. You can browse without
        an account. This page says what we keep when you sign in, and why.
      </p>

      <h3>What we collect</h3>
      <ul>
        <li>
          <strong>When you sign in with Google:</strong> your name, email address and the
          link to your Google profile picture. We use your name for your profile. We don't
          ask Google for anything else, and we can't see your Google password.
        </li>
        <li>
          <strong>When you sign in with an email link:</strong> your email address.
        </li>
        <li>
          <strong>What you add:</strong> links you submit, tags, votes, comments, and any
          changes you make to your profile.
        </li>
      </ul>

      <h3>What is public</h3>
      <p>
        Your profile name, and what you submit, tag and comment, can be seen by anyone.
        Your email address is never shown to other people.
      </p>

      <h3>What we don't do</h3>
      <p>
        We don't sell or share your information, show ads, or use tracking or advertising
        cookies. Your browser keeps a small sign-in record so you stay signed in. That's
        all it's used for.
      </p>

      <h3>Who else handles it</h3>
      <ul>
        <li>
          <strong>Supabase</strong> stores the database and runs sign-in.
        </li>
        <li>
          <strong>Vercel</strong> hosts the website.
        </li>
        <li>
          <strong>Google</strong> handles the sign-in, if you choose to sign in with Google.
        </li>
      </ul>
      <p>
        When you submit a link, the site visits that page to find its title and picture.
      </p>

      <h3>Deleting your account</h3>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we'll delete your
        account and email address. Questions about this page go to the same address.
      </p>
    </article>
  )
}
