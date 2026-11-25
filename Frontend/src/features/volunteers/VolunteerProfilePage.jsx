import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import TagList from "@/components/ui/TagList";
import QueryState from "@/components/common/QueryState";
import ReportDialog from "@/features/verification/ReportDialog";
import VolunteerProfileForm from "./VolunteerProfileForm";
import { useApiData } from "@/hooks/useApiData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getMyVolunteerProfile, getVolunteerProfile, updateMyVolunteerProfile } from "@/api/volunteersApi";
import { REPORT_TARGETS } from "@/config/constants";
import { formatDate } from "@/utils/format";

// Feature 7. /app/volunteer/profile -> own profile (editable)
//            /app/volunteers/:id     -> someone else's profile (read-only, can report)
export default function VolunteerProfilePage() {
  const { id } = useParams();
  const isOwn = !id;
  useDocumentTitle(isOwn ? "My profile" : "Volunteer profile");

  const { data: profile, loading, error, reload, setData } = useApiData(
    () => (isOwn ? getMyVolunteerProfile() : getVolunteerProfile(id)),
    [id]
  );
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (values) => {
    const updated = await updateMyVolunteerProfile(values); // errors are shown by the form
    setData(updated);
    setEditing(false);
    setSaved(true);
  };

  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      {profile && (
        <div className="stack stack--lg">
          <PageHeader
            title={profile.name}
            subtitle={[profile.city, profile.college].filter(Boolean).join(" · ") || "Location not added yet"}
            actions={
              isOwn ? (
                !editing && <Button variant="secondary" onClick={() => { setSaved(false); setEditing(true); }}>Edit profile</Button>
              ) : (
                <Button variant="ghost" onClick={() => setReporting(true)}>Report</Button>
              )
            }
          />

          {saved && <Alert type="success">Profile saved.</Alert>}

          <div className="stats">
            <div className="stat"><strong>{profile.total_hours}</strong><span>verified hours</span></div>
            <div className="stat"><strong>{profile.points}</strong><span>points</span></div>
            <div className="stat"><strong>{profile.completed_activities}</strong><span>activities completed</span></div>
            <div className="stat"><strong>{profile.achievements.length}</strong><span>badges</span></div>
          </div>

          {editing ? (
            <VolunteerProfileForm profile={profile} onSave={save} onCancel={() => setEditing(false)} />
          ) : (
            <>
              <section className="card stack">
                <h2>About</h2>
                <p>{profile.bio || <span className="muted">No bio yet.</span>}</p>
                <h3>Skills</h3>
                <TagList items={profile.skills} empty="No skills added yet." />
                <h3>Interests</h3>
                <TagList items={profile.interests} empty="No interests added yet." />
                <h3>Availability</h3>
                <TagList items={profile.availability} empty="Availability not set." />
                {isOwn && (
                  <ul className="list">
                    <li><span className="muted">Email</span><span>{profile.email}</span></li>
                    <li><span className="muted">Phone</span><span>{profile.phone || "-"}</span></li>
                    <li><span className="muted">Home location</span><span>{profile.latitude != null ? "Saved (private)" : "Not set"}</span></li>
                    <li><span className="muted">Referral code</span><strong className="code">{profile.referral_code}</strong></li>
                  </ul>
                )}
              </section>

              <section className="card stack">
                <div className="row row--between">
                  <h2>Achievements</h2>
                  {isOwn && <Link to="/app/badges">All badges</Link>}
                </div>
                {profile.achievements.length ? (
                  <ul className="list">
                    {profile.achievements.map((a) => (
                      <li key={a.id}>
                        <span><span className="badge-icon" aria-hidden="true">{a.icon}</span> <strong>{a.title}</strong> <span className="muted">· {a.description}</span></span>
                        <span className="muted">{formatDate(a.earned_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No achievements yet">Complete verified activities to earn badges.</EmptyState>
                )}
              </section>

              <section className="card stack">
                <h2>Volunteering history</h2>
                {profile.history.length ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Activity</th><th>Organization</th><th>Date</th><th>Hours</th><th>Verified by</th></tr></thead>
                      <tbody>
                        {profile.history.map((h) => (
                          <tr key={h.id}>
                            <td>
                              <Link to={`/app/opportunities/${h.event_id}`}>{h.event_title}</Link>
                              {h.feedback && <><br /><small className="muted">“{h.feedback}”</small></>}
                            </td>
                            <td><Link to={`/app/organizations/${h.organization_id}`}>{h.organization_name}</Link></td>
                            <td>{formatDate(h.date)}</td>
                            <td>{h.hours}</td>
                            <td>{h.method === "qr" ? "QR check-in" : "Organizer"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No activities yet">Verified activities will appear here.</EmptyState>
                )}
              </section>
            </>
          )}

          {!isOwn && (
            <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType={REPORT_TARGETS.USER} targetId={profile.user_id} targetLabel={profile.name} />
          )}
        </div>
      )}
    </QueryState>
  );
}
