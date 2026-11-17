import { Tagger } from './SubmissionTags'
import type { Tag } from './api'
import './tags.css'

/**
 * Tags chosen for an entry that doesn't exist yet. Nothing is saved: the
 * submit form puts them on the entry once it has been created. A new name
 * has no id yet, so it carries a stand-in one and shows as suggested.
 */
export function TagPicker({
  picked,
  onChange,
}: {
  picked: Tag[]
  onChange: (next: Tag[]) => void
}) {
  const add = (name: string, type = 'general', tag?: Tag) => {
    const lower = name.toLowerCase()
    if (picked.some((t) => t.name.toLowerCase() === lower)) return
    onChange([
      ...picked,
      tag ?? { id: `new:${lower}`, name, type, status: 'suggested' },
    ])
  }

  return (
    <div className="tag-picker">
      {picked.length > 0 && (
        <div className="tag-line">
          {picked.map((tag) => (
            <span key={tag.id} className={`tag ${tag.status}`}>
              {tag.name}
              <button
                type="button"
                className="tag-x"
                aria-label={`Remove tag ${tag.name}`}
                title={`Remove “${tag.name}”`}
                onClick={() => onChange(picked.filter((t) => t.id !== tag.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Tagger
        label="Tags"
        carried={picked}
        onAdd={add}
        onClose={() => {}}
        autoFocus={false}
      />
    </div>
  )
}
