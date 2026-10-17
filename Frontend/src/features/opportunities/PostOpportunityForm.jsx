import React, { useState } from 'react';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';

export default function PostOpportunityForm({ onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Education',
    location: '',
    type: 'In-person',
    description: '',
    requiredSkills: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const createdItem = {
        id: 'opp_' + Date.now(),
        ...formData,
        skills: formData.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        rating: 0,
        reviewsCount: 0,
        createdAt: new Date().toISOString()
      };

      if (onCreated) onCreated(createdItem);
      setFormData({
        title: '',
        category: 'Education',
        location: '',
        type: 'In-person',
        description: '',
        requiredSkills: ''
      });
      setLoading(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <h3 className="text-xl font-bold text-gray-900">Post New Opportunity</h3>

      <FormField label="Opportunity Title">
        <input
          type="text"
          name="title"
          className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="e.g. Primary School Math Tutor"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Category">
          <select
            name="category"
            className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="Education">Education</option>
            <option value="Environment">Environment</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Community Support">Community Support</option>
            <option value="Animal Welfare">Animal Welfare</option>
          </select>
        </FormField>

        <FormField label="Type">
          <select
            name="type"
            className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="In-person">In-person</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Location">
          <input
            type="text"
            name="location"
            className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. New Delhi / Remote"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </FormField>

        <FormField label="Required Skills (comma separated)">
          <input
            type="text"
            name="requiredSkills"
            className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. Teaching, Communication, English"
            value={formData.requiredSkills}
            onChange={handleChange}
          />
        </FormField>
      </div>

      <FormField label="Description">
        <textarea
          name="description"
          rows="3"
          className="w-full border border-gray-300 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Describe duties, schedule, and volunteer expectations..."
          value={formData.description}
          onChange={handleChange}
          required
        />
      </FormField>

      <Button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Publish Opportunity'}
      </Button>
    </form>
  );
}