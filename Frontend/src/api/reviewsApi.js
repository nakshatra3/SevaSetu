import { http } from "./httpClient";

export const listReviews = (params) => http.get("/reviews", { params });

export const getReviewEligibility = (params) => http.get("/reviews/eligibility", { params });

export const createReview = (data) => http.post("/reviews", data);
