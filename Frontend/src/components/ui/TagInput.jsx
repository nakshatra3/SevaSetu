import { useId, useState } from "react";

// Type a value and press Enter or comma to add it. Used for skills, interests, categories.
export default function TagInput({ label, value, onChange, placeholder = "Type and press Enter", hint }) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = () => {
    const tag = draft.trim();
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="taginput">
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        <input id={id} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown} onBlur={add} placeholder={placeholder} />
      </div>
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}
