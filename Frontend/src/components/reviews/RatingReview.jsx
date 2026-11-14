import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";

export function StarRating({ rating = 0, setRating, readOnly = false, size = "md" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  if (readOnly) {
    return (
      <span className={`stars stars--${size}`} aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= Math.round(shown) ? "star is-on" : "star"} aria-hidden="true">★</span>
        ))}
      </span>
    );
  }

  return (
    <div className={`stars stars--${size}`} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={rating === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={star <= shown ? "star is-on" : "star"}
          onClick={() => setRating(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ title = "Leave a rating & review", onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError("Please choose a star rating.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit({ rating, comment: comment.trim() });
      setRating(0);
      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form stack" noValidate>
      <h3>{title}</h3>
      <Alert type="error">{error}</Alert>
      <StarRating rating={rating} setRating={setRating} size="lg" />
      <FormField
        as="textarea"
        rows={3}
        label="Your review (optional)"
        maxLength={1000}
        placeholder="Share your experience volunteering for this cause..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div>
        <Button type="submit" loading={loading}>Submit review</Button>
      </div>
    </form>
  );
}
