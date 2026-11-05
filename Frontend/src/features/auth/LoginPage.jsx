import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { validateEmail, hasErrors } from "@/utils/validators";

export default function LoginPage() {
  useDocumentTitle("Log in");
  const { login, sessionExpired } = useAuth();
  const location = useLocation();

  const [form, setForm] = useState({ email: location.state?.email || "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {
      email: validateEmail(form.email),
      password: form.password ? "" : "Enter your password.",
    };
    setErrors(nextErrors);
    setSubmitError("");
    if (hasErrors(nextErrors)) return;

    setLoading(true);
    try {
      // On success AuthContext updates and GuestRoute redirects to the right dashboard.
      await login({ email: form.email.trim(), password: form.password });
    } catch (err) {
      setSubmitError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth__card">
      <h1>Log in</h1>
      <p className="muted">Welcome back. Enter your details to continue.</p>

      <Alert type="success">{location.state?.notice}</Alert>
      {sessionExpired && <Alert type="warning">Your session expired. Log in again to continue.</Alert>}
      <Alert type="error">{submitError}</Alert>

      <form onSubmit={onSubmit} noValidate className="stack">
        <FormField label="Email" type="email" autoComplete="email" value={form.email} onChange={update("email")} error={errors.email} />
        <FormField label="Password" type="password" autoComplete="current-password" value={form.password} onChange={update("password")} error={errors.password} />
        <Button type="submit" loading={loading}>Log in</Button>
      </form>

      <p className="auth__alt">
        New to SevaSetu? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
