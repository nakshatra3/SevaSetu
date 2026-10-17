import React, { useState } from 'react';
import Button from '../ui/Button';

export function StarRating({ rating = 0, setRating, readOnly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`text-xl transition-colors ${
            star <= (hover || rating) ? 'text-amber-400' : 'text-gray-300'
          } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={() => !readOnly && setRating && setRating(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({ opportunityId, onSubmitSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) return alert('Please select a star rating');

    setLoading(true);
    setTimeout(() => {
      const newReview = {
        id: Date.now(),
        opportunityId,
        rating,
        comment,
        createdAt: new Date().toISOString()
      };
      if (onSubmitSuccess) onSubmitSuccess(newReview);
      setRating(0);
      setComment('');
      setLoading(false);
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-4 mt-3">
      <h4 className="font-semibold text-sm text-gray-800">Leave a Review & Rating</h4>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Your Rating</label>
        <StarRating rating={rating} setRating={setRating} />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Your Review</label>
        <textarea
          className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          rows="3"
          placeholder="Share your experience volunteering for this cause..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} variant="primary">
        {loading ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}