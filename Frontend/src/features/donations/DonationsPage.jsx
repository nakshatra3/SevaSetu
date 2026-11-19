import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import FormField from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import QueryState from "@/components/common/QueryState";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { createDonation, decideDonation, getMyDonations, getReceivedDonations } from "@/api/donationsApi";
import { listOrganizations } from "@/api/organizationsApi";
import { DONATION_TYPES, ROLES } from "@/config/constants";
import { formatDate, formatRupees } from "@/utils/format";

export default function DonationsPage() {
  const { user } = useAuth();
  useDocumentTitle("Donations");
  return user.role === ROLES.ORGANIZATION ? <ReceivedDonations /> : <MyDonations />;
}

function describe(donation) {
  if (donation.type === "money") return formatRupees(donation.amount);
  const unit = DONATION_TYPES.find((t) => t.value === donation.type)?.unit || "items";
  return `${donation.quantity} ${unit}`;
}


function MyDonations() {
  const [searchParams] = useSearchParams();
  const { data, loading, error, reload, setData } = useApiData(getMyDonations, []);
  const { data: organizations } = useApiData(() => listOrganizations(), []);
  const [form, setForm] = useState({
    organization_id: searchParams.get("organization") || "",
    type: "books",
    amount: "",
    quantity: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const isMoney = form.type === "money";

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.organization_id) next.organization_id = "Choose an organization.";
    if (isMoney && !(Number(form.amount) >= 1)) next.amount = "Enter the amount in rupees.";
    if (!isMoney && !(Number(form.quantity) >= 1)) next.quantity = "Enter how many.";
    setErrors(next);
    setMessage({ type: "", text: "" });
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const donation = await createDonation({
        organization_id: form.organization_id,
        type: form.type,
        amount: isMoney ? Number(form.amount) : null,
        quantity: isMoney ? null : Number(form.quantity),
        description: form.description.trim(),
      });
      setData((prev) => [donation, ...(prev || [])]);
      setForm((f) => ({ ...f, amount: "", quantity: "", description: "" }));
      setMessage({ type: "success", text: "Donation recorded. You'll get points once the organization confirms it." });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Donations" subtitle="Record books, clothes, food or money you gave to an organization." />

      <form className="card stack" onSubmit={submit} noValidate>
        <h2>Record a donation</h2>
        {message.text && <Alert type={message.type}>{message.text}</Alert>}
        <div className="grid-2">
          <FormField as="select" label="Organization" value={form.organization_id} onChange={set("organization_id")} error={errors.organization_id}>
            <option value="">Choose an organization</option>
            {(organizations || []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}{o.verification_status === "verified" ? " ✔" : ""}</option>
            ))}
          </FormField>
          <FormField as="select" label="What are you donating?" value={form.type} onChange={set("type")}>
            {DONATION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </FormField>
          {isMoney ? (
            <FormField label="Amount (₹)" type="number" min="1" value={form.amount} onChange={set("amount")} error={errors.amount} />
          ) : (
            <FormField label={`Quantity (${DONATION_TYPES.find((t) => t.value === form.type).unit})`} type="number" min="1" value={form.quantity} onChange={set("quantity")} error={errors.quantity} />
          )}
          <FormField label="Note (optional)" maxLength={300} value={form.description} onChange={set("description")} />
        </div>
        <p className="muted">No payment happens here. The organization confirms the donation after receiving it.</p>
        <div><Button type="submit" loading={saving}>Record donation</Button></div>
      </form>

      <section className="stack">
        <h2>My donations</h2>
        <QueryState loading={loading} error={error} onRetry={reload}>
          {data?.length ? (
            <DonationTable donations={data} showOrganization />
          ) : (
            <EmptyState title="No donations yet">Your recorded donations will appear here.</EmptyState>
          )}
        </QueryState>
      </section>
    </div>
  );
}

function ReceivedDonations() {
  const [status, setStatus] = useState("pending");
  const { data, loading, error, reload, setData } = useApiData(() => getReceivedDonations(status), [status]);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const decide = async (donation, decision) => {
    setBusyId(donation.id);
    setActionError("");
    try {
      const updated = await decideDonation(donation.id, decision);
      setData((prev) => (status ? prev.filter((d) => d.id !== donation.id) : prev.map((d) => (d.id === donation.id ? updated : d))));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack stack--lg">
      <PageHeader title="Donations received" subtitle="Confirm donations once they reach you. Donors earn points only for confirmed donations." />
      <div className="filters">
        <FormField as="select" label="Show" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Waiting for confirmation</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </FormField>
      </div>
      <Alert type="error">{actionError}</Alert>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data?.length ? (
          <DonationTable
            donations={data}
            showDonor
            actions={(d) =>
              d.status === "pending" && (
                <div className="row row--end">
                  <Button size="sm" loading={busyId === d.id} onClick={() => decide(d, "verified")}>Verify</Button>
                  <Button size="sm" variant="danger" disabled={busyId === d.id} onClick={() => decide(d, "rejected")}>Reject</Button>
                </div>
              )
            }
          />
        ) : (
          <EmptyState title="Nothing here">No donations match this filter.</EmptyState>
        )}
      </QueryState>
    </div>
  );
}

function DonationTable({ donations, showOrganization, showDonor, actions }) {
  return (
    <div className="table-wrap card">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            {showOrganization && <th>Organization</th>}
            {showDonor && <th>Donor</th>}
            <th>Type</th><th>Amount</th><th>Note</th><th>Status</th><th>Points</th>
            {actions && <th><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {donations.map((d) => (
            <tr key={d.id}>
              <td>{formatDate(d.created_at)}</td>
              {showOrganization && <td><Link to={`/app/organizations/${d.organization_id}`}>{d.organization_name}</Link></td>}
              {showDonor && <td>{d.donor_name}</td>}
              <td>{DONATION_TYPES.find((t) => t.value === d.type)?.label}</td>
              <td>{describe(d)}</td>
              <td>{d.description || "-"}</td>
              <td><StatusBadge kind="donation" status={d.status} /></td>
              <td>{d.points_awarded || "-"}</td>
              {actions && <td className="cell-actions">{actions(d)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
