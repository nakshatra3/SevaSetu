import { useId } from "react";

// One component for input, textarea and select.
//   <FormField label="Email" type="email" value={v} onChange={...} error={err} />
//   <FormField as="textarea" label="Bio" ... />
//   <FormField as="select" label="Role" ...><option>..</option></FormField>
export default function FormField({ as = "input", label, hint, error, className = "", children, ...props }) {
  const id = useId();
  const Control = as;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`field ${error ? "field--error" : ""} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <Control id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </Control>
      {error ? (
        <p className="field__error" id={`${id}-error`} role="alert">{error}</p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>{hint}</p>
      ) : null}
    </div>
  );
}
