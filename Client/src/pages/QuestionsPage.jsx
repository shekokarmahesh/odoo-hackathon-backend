import { useState } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import { Card, Button, Input, Badge, Avatar, LoadingSpinner } from '../components/ui';
import { Link } from 'react-router-dom';
import { formatDate, formatNumber } from '../utils/helpers';

const QuestionsPage = () => {
  const [filters, setFilters] = useState({
    search: '',
    sort: 'newest',
    tags: ''
  });

  const { questions, loading, error, pagination, goToPage } = useQuestions(filters);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Questions</h1>
        <Link to="/ask">
          <Button>Ask Question</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search questions..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1"
          />
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="votes">Most Votes</option>
            <option value="views">Most Views</option>
          </select>
        </div>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {questions?.map((question) => (
            <Card key={question._id} className="p-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center text-sm text-gray-500 space-y-2 min-w-[80px]">
                  <div>{formatNumber(question.voteScore)} votes</div>
                  <div>{formatNumber(question.answerCount)} answers</div>
                  <div>{formatNumber(question.views)} views</div>
                </div>
                <div className="flex-1">
                  <Link 
                    to={`/questions/${question._id}`}
                    className="text-lg font-medium text-primary-600 hover:text-primary-700 mb-2 block"
                  >
                    {question.title}
                  </Link>
                  <p className="text-gray-600 mb-3 line-clamp-2">{question.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {question.tags?.map((tag) => (
                      <Badge key={tag._id} variant="primary">{tag.name}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Avatar src={question.author?.profile?.avatar} alt={question.author?.username} size="sm" />
                      <span>{question.author?.username}</span>
                    </div>
                    <span>{formatDate(question.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-2 rounded ${
                  page === pagination.currentPage
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionsPage;
