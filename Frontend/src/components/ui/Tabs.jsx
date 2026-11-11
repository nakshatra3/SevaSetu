// Simple tab buttons.
// <Tabs value={tab} onChange={setTab} options={[{ value: "upcoming", label: "Upcoming" }]} />
export default function Tabs({ value, onChange, options, label = "Views" }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={value === opt.value ? "tab is-active" : "tab"}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
