import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { Card, Button, Badge, Avatar, LoadingSpinner } from '../components/ui';
import { formatDate } from '../utils/helpers';
import { 
  EyeIcon, 
  ChatBubbleLeftIcon, 
  ArrowUpIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const Questions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    sort: searchParams.get('sort') || 'newest',
    status: searchParams.get('status') || 'all',
    tags: searchParams.get('tags') || '',
  });

  const { questions, loading, error, pagination, goToPage } = useQuestions(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    setSearchParams(newParams);
  };

  const QuestionCard = ({ question }) => (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        {/* Vote/Stats Column */}
        <div className="flex flex-col items-center space-y-2 text-sm text-gray-500 min-w-[80px]">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <ArrowUpIcon className="h-4 w-4" />
              <span className="font-medium">{question.voteScore || 0}</span>
            </div>
            <div className="text-xs text-gray-400">votes</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span className="font-medium">{question.answerCount || 0}</span>
            </div>
            <div className="text-xs text-gray-400">answers</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <EyeIcon className="h-4 w-4" />
              <span className="font-medium">{question.views || 0}</span>
            </div>
            <div className="text-xs text-gray-400">views</div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1">
          <Link 
            to={`/questions/${question._id}`}
            className="block group"
          >
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
              {question.title}
            </h3>
          </Link>
          
          <p className="text-gray-600 mb-3 line-clamp-2">
            {question.description.substring(0, 200)}...
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {question.tags?.map((tag) => (
              <Badge key={tag._id || tag} variant="default" className="text-xs hover:bg-primary-100 cursor-pointer">
                {tag.name || tag}
              </Badge>
            ))}
          </div>

          {/* Author and Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar 
                src={question.author?.profile?.avatar} 
                alt={question.author?.username} 
                size="sm" 
              />
              <div className="text-sm">
                <span className="text-gray-600">asked by </span>
                <Link 
                  to={`/users/${question.author?._id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {question.author?.username}
                </Link>
                <span className="text-gray-500 ml-2">
                  {formatDate(question.createdAt)}
                </span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {question.acceptedAnswer && (
                <Badge variant="success" className="text-xs">
                  ✓ Answered
                </Badge>
              )}
              {question.isPinned && (
                <Badge variant="warning" className="text-xs">
                  📌 Pinned
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const Pagination = () => (
    <div className="flex items-center justify-between mt-8">
      <div className="text-sm text-gray-700">
        Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalQuestions)} of {pagination.totalQuestions} questions
      </div>
      
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasPrevPage}
          onClick={() => goToPage(pagination.currentPage - 1)}
        >
          Previous
        </Button>
        
        {/* Page numbers */}
        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
          const page = i + 1;
          return (
            <Button
              key={page}
              variant={page === pagination.currentPage ? "primary" : "outline"}
              size="sm"
              onClick={() => goToPage(page)}
            >
              {page}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasNextPage}
          onClick={() => goToPage(pagination.currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Questions</h1>
          <p className="text-gray-600 mt-2">
            {pagination.totalQuestions} questions found
          </p>
        </div>
        
        <Link to="/ask">
          <Button className="flex items-center space-x-2">
            <PlusIcon className="h-4 w-4" />
            <span>Ask Question</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center space-x-4">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
          
          {/* Sort Filter */}
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="votes">Most Votes</option>
            <option value="views">Most Views</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Questions</option>
            <option value="active">Active</option>
            <option value="unanswered">Unanswered</option>
            <option value="answered">Answered</option>
          </select>

          {/* Tag Filter */}
          <input
            type="text"
            placeholder="Filter by tags..."
            value={filters.tags}
            onChange={(e) => handleFilterChange('tags', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
          />
        </div>
      </Card>

      {/* Questions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-red-600">Error loading questions: {error}</p>
        </Card>
      ) : questions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No questions found matching your criteria.</p>
          <Link to="/ask">
            <Button>Ask the first question</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard key={question._id} question={question} />
            ))}
          </div>
          
          <Pagination />
        </>
      )}
    </div>
  );
};

export default Questions;
