import httpClient from './httpClient';

export const opportunitiesApi = {
  // Fetch opportunities with search and filter parameters
  getOpportunities: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return httpClient.get(`/opportunities${query ? `?${query}` : ''}`);
  },

  // Get single opportunity by ID
  getOpportunityById: async (id) => {
    return httpClient.get(`/opportunities/${id}`);
  },

  // Post a new opportunity
  createOpportunity: async (data) => {
    return httpClient.post('/opportunities', data);
  },

  // Submit a rating and review
  addReview: async (opportunityId, reviewData) => {
    return httpClient.post(`/opportunities/${opportunityId}/reviews`, reviewData);
  },

  // Fetch reviews for an opportunity
  getReviews: async (opportunityId) => {
    return httpClient.get(`/opportunities/${opportunityId}/reviews`);
  }
};