import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ROLES } from "@/config/constants";
import { hasErrors, validateEmail, validateName, validateOrganizationName, validatePassword } from "@/utils/validators";

const EMPTY = { role: ROLES.VOLUNTEER, name: "", organization_name: "", email: "", password: "", confirm: "" };

export default function RegisterPage() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOrg = form.role === ROLES.ORGANIZATION;
  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => ({
    name: validateName(form.name),
    organization_name: isOrg ? validateOrganizationName(form.organization_name) : "",
    email: validateEmail(form.email),
    password: validatePassword(form.password),
    confirm: form.confirm === form.password ? "" : "Passwords don't match.",
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");
    if (hasErrors(nextErrors)) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        ...(isOrg ? { organization_name: form.organization_name.trim() } : {}),
      };
      await register(payload);
      navigate("/login", { replace: true, state: { notice: "Account created. Log in to continue.", email: payload.email } });
    } catch (err) {
      // 409 = email already used; 422 = field errors from FastAPI/Pydantic.
      if (err.status === 409) setErrors({ email: err.message });
      else if (Object.keys(err.fieldErrors || {}).length) setErrors(err.fieldErrors);
      else setSubmitError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth__card">
      <h1>Create your account</h1>
      <p className="muted">Choose how you'll use SevaSetu.</p>

      <Alert type="error">{submitError}</Alert>

      <form onSubmit={onSubmit} noValidate className="stack">
        <fieldset className="segmented">
          <legend className="sr-only">Account type</legend>
          {[
            { value: ROLES.VOLUNTEER, label: "I want to volunteer" },
            { value: ROLES.ORGANIZATION, label: "I represent an organization" },
          ].map((opt) => (
            <label key={opt.value} className={form.role === opt.value ? "is-selected" : ""}>
              <input type="radio" name="role" value={opt.value} checked={form.role === opt.value} onChange={update("role")} />
              {opt.label}
            </label>
          ))}
        </fieldset>

        <FormField label={isOrg ? "Contact person name" : "Full name"} autoComplete="name" value={form.name} onChange={update("name")} error={errors.name} />
        {isOrg && (
          <FormField label="Organization name" value={form.organization_name} onChange={update("organization_name")} error={errors.organization_name} />
        )}
        <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={update("email")} error={errors.email} />
        <FormField label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={form.password} onChange={update("password")} error={errors.password} />
        <FormField label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} error={errors.confirm} />

        <Button type="submit" loading={loading}>Create account</Button>
      </form>

      <p className="auth__alt">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
