import { useState } from 'react';
import { useI18nStore } from '../../stores/i18nStore';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagEditor({ tags, onChange }: Props) {
  const [input, setInput] = useState('');
  const { t } = useI18nStore();

  const addTag = () => {
    const tag = input.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
      setInput('');
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tags.map((tag, i) => (
          <span
            key={i}
            style={{
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '2px 10px', fontSize: 11, color: 'var(--color-text)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
                fontSize: 13, padding: 0, lineHeight: 1,
              }}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={t('editor.addTag')}
          style={{
            flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '4px 8px', fontSize: 12, color: 'var(--color-text)',
            outline: 'none',
          }}
        />
        <button
          onClick={addTag}
          style={{
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
            color: 'var(--color-text-muted)',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
