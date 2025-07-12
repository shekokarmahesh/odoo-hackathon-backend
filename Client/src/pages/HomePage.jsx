import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import { Card, Button, Badge, Avatar, LoadingSpinner } from '../components/ui';
import { formatDate, formatNumber } from '../utils/helpers';
import { 
  ArrowUpIcon, 
  ChatBubbleLeftIcon, 
  EyeIcon,
  PlusIcon,
  FireIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const QuestionCard = ({ question }) => {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Vote and stats sidebar */}
        <div className="flex flex-col items-center text-sm text-gray-500 space-y-2 min-w-[80px]">
          <div className="flex items-center space-x-1">
            <ArrowUpIcon className="h-4 w-4" />
            <span className="font-medium">{formatNumber(question.voteScore)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ChatBubbleLeftIcon className="h-4 w-4" />
            <span>{formatNumber(question.answerCount)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <EyeIcon className="h-4 w-4" />
            <span>{formatNumber(question.views)}</span>
          </div>
        </div>

        {/* Question content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <Link 
              to={`/questions/${question._id}`}
              className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors line-clamp-2"
            >
              {question.title}
            </Link>
            {question.acceptedAnswer && (
              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 ml-2" />
            )}
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {question.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {question.tags?.map((tag) => (
              <Badge key={tag._id} variant="primary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Author and timestamp */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <Avatar 
                src={question.author?.profile?.avatar} 
                alt={question.author?.username} 
                size="sm" 
              />
              <span>
                asked by{' '}
                <Link 
                  to={`/users/${question.author?._id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  {question.author?.username}
                </Link>
              </span>
            </div>
            <span>{formatDate(question.createdAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('recent');
  const { questions, loading, error } = useQuestions({ 
    sort: activeTab === 'recent' ? 'newest' : activeTab === 'popular' ? 'votes' : 'views' 
  });

  const tabs = [
    { id: 'recent', label: 'Recent Questions', icon: ClockIcon },
    { id: 'popular', label: 'Popular', icon: FireIcon },
    { id: 'trending', label: 'Trending', icon: ArrowUpIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome to StackIt
            </h1>
            <p className="text-lg text-primary-100 mb-6 max-w-2xl">
              Join our community of developers helping each other solve coding problems, 
              share knowledge, and build better software together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/ask">
                <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Ask Your First Question
                </Button>
              </Link>
              <Link to="/questions">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary-600">
                  Browse Questions
                </Button>
              </Link>
            </div>
          </div>

          {/* Question Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            <Link to="/ask">
              <Button size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Ask Question
              </Button>
            </Link>
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-red-600 mb-4">Error loading questions: {error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions?.length > 0 ? (
                questions.map((question) => (
                  <QuestionCard key={question._id} question={question} />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-gray-500 mb-4">
                    <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No questions yet
                    </h3>
                    <p>Be the first to ask a question and start the conversation!</p>
                  </div>
                  <Link to="/ask">
                    <Button>Ask the First Question</Button>
                  </Link>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 space-y-6">
          {/* Community Stats */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Community Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Questions</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Answers</span>
                <span className="font-medium">5,678</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Users</span>
                <span className="font-medium">890</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tags</span>
                <span className="font-medium">156</span>
              </div>
            </div>
          </Card>

          {/* Popular Tags */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Popular Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {['javascript', 'react', 'node.js', 'python', 'mongodb', 'express'].map((tag) => (
                <Badge key={tag} variant="primary" className="cursor-pointer hover:bg-primary-200">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Getting Started */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Getting Started
            </h3>
            <div className="space-y-3 text-sm">
              <Link to="/help/how-to-ask" className="block text-primary-600 hover:text-primary-700">
                → How to ask a good question
              </Link>
              <Link to="/help/how-to-answer" className="block text-primary-600 hover:text-primary-700">
                → How to write a great answer
              </Link>
              <Link to="/help/reputation" className="block text-primary-600 hover:text-primary-700">
                → Understanding reputation
              </Link>
              <Link to="/help/tags" className="block text-primary-600 hover:text-primary-700">
                → Using tags effectively
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
