import { useState, type FormEvent } from 'react'
import { createSubmission } from './api'
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

export function SubmitForm({ onSubmitted }: SubmitFormProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const trimmedDescription = description.trim()
    if (!validUrl(trimmedUrl)) {
      setError('Enter a full link, starting with http:// or https://')
      return
    }
    setError(null)
    setBusy(true)
    createSubmission({ url: trimmedUrl, description: trimmedDescription })
      .then(() => {
        setUrl('')
        setDescription('')
        setOpen(false)
        onSubmitted()
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
      <label>
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why is it worth someone’s time? The title and thumbnail are worked out from the link."
          rows={2}
        />
      </label>
      {error && <p className="submit-error">{error}</p>}
      <div className="submit-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Submit'}
        </button>
        <button type="button" className="quiet" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
