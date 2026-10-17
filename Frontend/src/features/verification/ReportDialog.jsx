import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import { createReport } from "@/api/reportsApi";
import { REPORT_REASONS } from "@/config/constants";

// Reusable: <ReportDialog open onClose targetType="organization" targetId={id} targetLabel={name} />
// Part B can reuse it for events with targetType="event".
export default function ReportDialog({ open, onClose, targetType, targetId, targetLabel }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const close = () => {
    setReason("");
    setDetails("");
    setError("");
    setFieldError("");
    setSent(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setFieldError("Choose a reason.");
      return;
    }
    setFieldError("");
    setError("");
    setLoading(true);
    try {
      await createReport({ target_type: targetType, target_id: targetId, target_label: targetLabel, reason, details: details.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={`Report ${targetLabel || "this"}`}>
      {sent ? (
        <div className="stack">
          <Alert type="success">Report sent. Our team will review it.</Alert>
          <Button onClick={close}>Close</Button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit} noValidate>
          <Alert type="error">{error}</Alert>
          <FormField as="select" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={fieldError}>
            <option value="">Select a reason</option>
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </FormField>
          <FormField as="textarea" rows={4} label="What happened? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} />
          <div className="row row--end">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" variant="danger" loading={loading}>Send report</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
