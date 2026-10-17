import React, { useState } from 'react';
import PostOpportunityForm from './PostOpportunityForm';
import { StarRating, ReviewForm } from '../../components/reviews/RatingReview';
import Badge from '../../components/ui/Badge';

const INITIAL_OPPORTUNITIES = [
  {
    id: '1',
    title: 'Weekend Literacy Drive',
    category: 'Education',
    location: 'Mumbai',
    type: 'In-person',
    description: 'Help teach basic reading and writing skills to primary school students.',
    skills: ['Teaching', 'Patience', 'Hindi'],
    rating: 4.6,
    reviewsCount: 8
  },
  {
    id: '2',
    title: 'Urban Tree Plantation Drive',
    category: 'Environment',
    location: 'Bengaluru',
    type: 'In-person',
    description: 'Join our local environmental campaign to plant native saplings.',
    skills: ['Gardening', 'Physical Fitness'],
    rating: 4.9,
    reviewsCount: 15
  },
  {
    id: '3',
    title: 'Remote Graphic Designer',
    category: 'Community Support',
    location: 'Remote',
    type: 'Remote',
    description: 'Create promotional posters for NGO fundraising campaigns.',
    skills: ['Figma', 'Canva', 'Graphic Design'],
    rating: 4.2,
    reviewsCount: 4
  }
];

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeReviewFormId, setActiveReviewFormId] = useState(null);

  const handleCreated = (newOpp) => {
    setOpportunities([newOpp, ...opportunities]);
  };

  const filteredOpportunities = opportunities.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    const matchesType = typeFilter ? item.type === typeFilter : true;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 1. Post Opportunity Form */}
      <PostOpportunityForm onCreated={handleCreated} />

      {/* 2. Search & Filter Bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Search & Filter Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search title, skills, location..."
            className="border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="Education">Education</option>
            <option value="Environment">Environment</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Community Support">Community Support</option>
            <option value="Animal Welfare">Animal Welfare</option>
          </select>

          <select
            className="border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="In-person">In-person</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
      </div>

      {/* 3. Opportunities List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">
            Available Opportunities ({filteredOpportunities.length})
          </h3>
        </div>

        {filteredOpportunities.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
            No opportunities match your current filters.
          </div>
        ) : (
          filteredOpportunities.map((opp) => (
            <div key={opp.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{opp.title}</h4>
                  <p className="text-xs text-gray-500">
                    {opp.category} • {opp.location} • <span className="font-medium text-blue-600">{opp.type}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(opp.rating)} readOnly />
                  <span className="text-sm font-semibold text-gray-700">
                    {opp.rating} ({opp.reviewsCount} reviews)
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-700 leading-relaxed">{opp.description}</p>

              {opp.skills && opp.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {opp.skills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  onClick={() => setActiveReviewFormId(activeReviewFormId === opp.id ? null : opp.id)}
                >
                  {activeReviewFormId === opp.id ? 'Hide Review Form' : '★ Add Rating & Review'}
                </button>

                {activeReviewFormId === opp.id && (
                  <ReviewForm
                    opportunityId={opp.id}
                    onSubmitSuccess={(newReview) => {
                      alert('Thank you for submitting your review!');
                      // Recalculate review count locally
                      setOpportunities((prev) =>
                        prev.map((item) =>
                          item.id === opp.id
                            ? { ...item, reviewsCount: item.reviewsCount + 1 }
                            : item
                        )
                      );
                      setActiveReviewFormId(null);
                    }}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}