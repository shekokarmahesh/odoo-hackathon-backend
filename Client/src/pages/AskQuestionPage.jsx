import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionService, tagService } from '../services';
import { Card, Button, Input, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

const AskQuestionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await questionService.create({
        title: formData.title,
        description: formData.description,
        tags: formData.tags
      });

      if (response.success) {
        navigate(`/questions/${response.data._id}`);
      }
    } catch (error) {
      console.error('Error creating question:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (formData.tags.length === 0) {
      newErrors.tags = 'At least one tag is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ask a Question</h1>
        <p className="text-gray-600">
          Be specific and imagine you're asking a question to another person
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <div className="space-y-6">
            {/* Title */}
            <Input
              label="Title"
              placeholder="What's your programming question? Be specific."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              error={errors.title}
            />

            {/* Description */}
            <Textarea
              label="Description"
              placeholder="Provide more details about your question. Include what you've tried and what exactly you're trying to achieve."
              rows={8}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              error={errors.description}
            />

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add tags (e.g., javascript, react, node.js)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add Tag
                </Button>
              </div>
              
              {/* Selected tags */}
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-primary-600 hover:text-primary-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              {errors.tags && (
                <p className="text-sm text-red-600">{errors.tags}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-6 mb-6 bg-blue-50 border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Tips for a great question:</h3>
          <ul className="space-y-2 text-blue-800 text-sm">
            <li>• Be specific about your problem</li>
            <li>• Include relevant code snippets</li>
            <li>• Mention what you've already tried</li>
            <li>• Use proper tags to help others find your question</li>
            <li>• Proofread before posting</li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            loading={loading}
            disabled={loading}
          >
            Post Your Question
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AskQuestionPage;
