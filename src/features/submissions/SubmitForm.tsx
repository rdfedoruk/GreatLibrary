import { useState, type FormEvent } from 'react'
import {
  ProfilePicker,
  createUnclaimedProfile,
  type PickedProfile,
} from '../profiles'
import { TagPicker, tagSubmission, type Tag } from '../tags'
import { attributeProfile, createSubmission } from './api'
import './submissions.css'

interface SubmitFormProps {
  onSubmitted: () => void
}

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Credits and tags go on after the entry exists, one at a time. Returns the
 * names that couldn't be added, so the form can say so; the entry itself is
 * already in the library by then.
 */
async function addCreditsAndTags(
  submissionId: string,
  profiles: PickedProfile[],
  tags: Tag[],
): Promise<string[]> {
  const failed: string[] = []
  for (const p of profiles) {
    try {
      const id = p.id ?? (await createUnclaimedProfile(p.name)).id
      await attributeProfile(submissionId, id)
    } catch {
      failed.push(p.name)
    }
  }
  for (const t of tags) {
    try {
      await tagSubmission(submissionId, t.name, t.type)
    } catch {
      failed.push(t.name)
    }
  }
  return failed
}

export function SubmitForm({ onSubmitted }: SubmitFormProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [profiles, setProfiles] = useState<PickedProfile[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setUrl('')
    setProfiles([])
    setTags([])
    setError(null)
    setOpen(false)
  }

  if (!open) {
    return (
      <div className="submit-bar">
        <button type="button" onClick={() => setOpen(true)}>
          Submit content
        </button>
      </div>
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedUrl = url.trim()
    if (!validUrl(trimmedUrl)) {
      setError('Enter a full link, starting with http:// or https://')
      return
    }
    setError(null)
    setBusy(true)
    createSubmission({ url: trimmedUrl })
      .then(async (id) => {
        const failed = await addCreditsAndTags(id, profiles, tags)
        reset()
        onSubmitted()
        if (failed.length > 0) {
          window.alert(
            `Added to the library, but these couldn’t be added: ${failed.join(', ')}. ` +
              'You can add them on the entry’s own page.',
          )
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setBusy(false))
  }

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <h2>Add to the library</h2>
      <label>
        Link
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          required
        />
      </label>
      <div className="submit-field">
        <span className="submit-field-label">Attributions</span>
        <ProfilePicker picked={profiles} onChange={setProfiles} />
      </div>
      <div className="submit-field">
        <span className="submit-field-label">Tags</span>
        <TagPicker picked={tags} onChange={setTags} />
      </div>
      {error && <p className="submit-error">{error}</p>}
      <div className="submit-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Submit'}
        </button>
        <button type="button" className="quiet" disabled={busy} onClick={reset}>
          Cancel
        </button>
      </div>
    </form>
  )
}
