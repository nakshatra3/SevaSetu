import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ROLES } from "@/config/constants";
import {
  hasErrors,
  validateEmail,
  validateName,
  validateOrganizationName,
  validatePassword,
} from "@/utils/validators";

const EMPTY = {
  role: ROLES.VOLUNTEER,
  organizerType: "organization",
  name: "",
  organization_name: "",
  email: "",
  password: "",
  confirm: "",
  referral_code: "",
};

export default function RegisterPage() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOrg = form.role === ROLES.ORGANIZATION;
  const representsOrganization = isOrg && form.organizerType === "organization";
  const update = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => ({
    name: validateName(form.name),
    organization_name: representsOrganization
      ? validateOrganizationName(form.organization_name)
      : "",
    email: validateEmail(form.email),
    password: validatePassword(form.password),
    confirm: form.confirm === form.password ? "" : "Passwords don't match.",
  });

  const onSubmit = async (event) => {
    event.preventDefault();
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
        // Existing API expects organization_name for organizer-role users.
        // An independent organizer does not enter an organization name;
        // we use their personal name as a compatibility label instead.
        ...(isOrg
          ? {
              organization_name: representsOrganization
                ? form.organization_name.trim()
                : form.name.trim(),
            }
          : {}),
        ...(!isOrg && form.referral_code.trim()
          ? { referral_code: form.referral_code.trim() }
          : {}),
      };
      await register(payload);
      navigate("/login", {
        replace: true,
        state: { notice: "Account created. Log in to continue.", email: payload.email },
      });
    } catch (err) {
      if (err.status === 409) setErrors({ email: err.message });
      else if (err.message === "Referral code not found.")
        setErrors({ referral_code: err.message });
      else if (Object.keys(err.fieldErrors || {}).length)
        setErrors(err.fieldErrors);
      else setSubmitError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth__card register-card">
      <div className="register-heading">
        <div>
          <h1>Create your account</h1>
          <p className="muted">Join SevaSetu in just one step.</p>
        </div>
        <Link
          to="/"
          className="login-home-btn register-home-btn"
          title="Back to homepage"
          aria-label="Back to homepage"
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="m3 10 9-7 9 7" />
            <path d="M5 9v12h14V9" />
            <path d="M9 21v-7h6v7" />
          </svg>
        </Link>
      </div>

      <Alert type="error">{submitError}</Alert>

      <form onSubmit={onSubmit} noValidate className="register-form">
        <fieldset className="segmented register-roles">
          <legend className="sr-only">Account type</legend>
          {[
            { value: ROLES.VOLUNTEER, label: "I want to volunteer" },
            { value: ROLES.ORGANIZATION, label: "I want to organize events" },
          ].map((option) => (
            <label key={option.value} className={form.role === option.value ? "is-selected" : ""}>
              <input type="radio" name="role" value={option.value}
                checked={form.role === option.value} onChange={update("role")} />
              {option.label}
            </label>
          ))}
        </fieldset>

        {isOrg && (
          <fieldset className="register-organizer-kind">
            <legend>Are you organizing as...</legend>
            <label>
              <input type="radio" name="organizerType" value="organization"
                checked={form.organizerType === "organization"}
                onChange={update("organizerType")} />
              An organization / NGO
            </label>
            <label>
              <input type="radio" name="organizerType" value="individual"
                checked={form.organizerType === "individual"}
                onChange={update("organizerType")} />
              An individual organizer
            </label>
          </fieldset>
        )}

        <div className="register-fields">
          <FormField
            label={isOrg ? "Your full name" : "Full name"}
            autoComplete="name"
            value={form.name}
            onChange={update("name")}
            error={errors.name}
          />
          {representsOrganization && (
            <FormField
              label="Organization / NGO name"
              value={form.organization_name}
              onChange={update("organization_name")}
              error={errors.organization_name}
            />
          )}
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            error={errors.email}
          />
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={form.password}
            onChange={update("password")}
            error={errors.password}
          />
          <FormField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update("confirm")}
            error={errors.confirm}
          />
          {!isOrg && (
            <FormField
              label="Referral code (optional)"
              hint="Have a code? Your friend earns points after your first activity."
              maxLength={20}
              value={form.referral_code}
              onChange={update("referral_code")}
              error={errors.referral_code}
            />
          )}
        </div>

        {isOrg && form.organizerType === "individual" && (
          <p className="register-organizer-note">
            No organization name is needed. You can register as an individual event organizer.
          </p>
        )}

        <Button type="submit" loading={loading}>Create account</Button>
      </form>

      <p className="auth__alt">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
