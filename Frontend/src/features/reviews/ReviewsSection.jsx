import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import QueryState from "@/components/common/QueryState";
import { ReviewForm, StarRating } from "@/components/reviews/RatingReview";
import { useApiData } from "@/hooks/useApiData";
import { useAuth } from "@/hooks/useAuth";
import { createReview, getReviewEligibility, listReviews } from "@/api/reviewsApi";
import { ROLES } from "@/config/constants";
import { formatDate } from "@/utils/format";

// Reviews for one organization or one event (Feature 14).
// <ReviewsSection target={{ event_id }} />  or  <ReviewsSection target={{ organization_id }} />
export default function ReviewsSection({ target, title = "Ratings & reviews", onReviewAdded }) {
  const { user } = useAuth();
  const key = target.event_id || target.organization_id;
  const { data: reviews, loading, error, reload } = useApiData(() => listReviews(target), [key]);
  const [eligibility, setEligibility] = useState(null);
  const [thanks, setThanks] = useState(false);

  // Volunteers: can I review? (only after verified attendance, once)
  useEffect(() => {
    if (user.role !== ROLES.VOLUNTEER) return;
    getReviewEligibility(target).then(setEligibility).catch(() => setEligibility(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user.role]);

  const submit = async (values) => {
    await createReview({ ...target, ...values });
    setEligibility({ can_review: false, reason: "You have already reviewed this." });
    setThanks(true);
    reload({ silent: true });
    onReviewAdded?.();
  };

  return (
    <section className="card stack">
      <h2>{title}</h2>
      {thanks && <p className="text-success">Thank you for your review!</p>}
      {eligibility?.can_review && <ReviewForm onSubmit={submit} />}
      {eligibility && !eligibility.can_review && !thanks && <p className="muted">{eligibility.reason}</p>}

      <QueryState loading={loading} error={error} onRetry={reload}>
        {reviews?.length ? (
          <ul className="list">
            {reviews.map((r) => (
              <li key={r.id} className="review">
                <div className="stack stack--tight">
                  <div className="row">
                    <StarRating rating={r.rating} readOnly size="sm" />
                    <strong>{r.reviewer_name}</strong>
                    {r.event_title && !target.event_id && <span className="muted">· {r.event_title}</span>}
                  </div>
                  {r.comment && <p>{r.comment}</p>}
                </div>
                <small className="muted">{formatDate(r.created_at)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet">Volunteers who attend can leave a review.</EmptyState>
        )}
      </QueryState>
    </section>
  );
}
