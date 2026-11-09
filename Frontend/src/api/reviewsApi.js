import { http } from "./httpClient";

// params: { organization_id } or { event_id }
export const listReviews = (params) => http.get("/reviews", { params });

// -> { can_review: boolean, reason: string }
export const getReviewEligibility = (params) => http.get("/reviews/eligibility", { params });

// data: { organization_id? , event_id?, rating: 1-5, comment }
export const createReview = (data) => http.post("/reviews", data);
