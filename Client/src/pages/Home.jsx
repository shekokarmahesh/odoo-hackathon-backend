import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { Card, Button, Badge, Avatar, LoadingSpinner } from '../components/ui';
import { formatDate } from '../utils/helpers';
import { 
  EyeIcon, 
  ChatBubbleLeftIcon, 
  ArrowUpIcon,
  ClockIcon,
  TrophyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { questions, loading, error } = useQuestions({ 
    sort: 'newest', 
    limit: 10 
  });
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    // Mock stats - in real app, fetch from API
    setStats({
      totalQuestions: 1250,
      totalAnswers: 3400,
      totalUsers: 850,
    });
  }, []);

  const QuestionCard = ({ question }) => (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex space-x-4">
        {/* Vote/Stats Column */}
        <div className="flex flex-col items-center space-y-2 text-sm text-gray-500 min-w-[60px]">
          <div className="flex items-center space-x-1">
            <ArrowUpIcon className="h-4 w-4" />
            <span>{question.voteScore || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ChatBubbleLeftIcon className="h-4 w-4" />
            <span>{question.answerCount || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <EyeIcon className="h-4 w-4" />
            <span>{question.views || 0}</span>
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
            {question.description.substring(0, 150)}...
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {question.tags?.map((tag) => (
              <Badge key={tag._id || tag} variant="default" className="text-xs">
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
            
            {question.acceptedAnswer && (
              <Badge variant="success" className="text-xs">
                Answered
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to StackIt
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          A community-driven platform where developers help each other solve coding problems and share knowledge.
        </p>
        <div className="flex justify-center space-x-4">
          <Link to="/ask">
            <Button size="lg">Ask a Question</Button>
          </Link>
          <Link to="/questions">
            <Button variant="outline" size="lg">Browse Questions</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
            <ChatBubbleLeftIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalQuestions.toLocaleString()}
          </div>
          <div className="text-gray-600">Questions Asked</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
            <TrophyIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalAnswers.toLocaleString()}
          </div>
          <div className="text-gray-600">Answers Provided</div>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4">
            <UserGroupIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {stats.totalUsers.toLocaleString()}
          </div>
          <div className="text-gray-600">Active Users</div>
        </Card>
      </div>

      {/* Recent Questions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Questions</h2>
          <Link to="/questions">
            <Button variant="outline">View All Questions</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center">
            <p className="text-red-600">Error loading questions: {error}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <QuestionCard key={question._id} question={question} />
            ))}
          </div>
        )}
      </div>

      {/* How it Works */}
      <div className="bg-gray-100 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          How StackIt Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Questions</h3>
            <p className="text-gray-600">
              Post your coding questions with clear descriptions and relevant tags.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Answers</h3>
            <p className="text-gray-600">
              Receive helpful answers from experienced developers in the community.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary-600">3</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Build Reputation</h3>
            <p className="text-gray-600">
              Help others and earn reputation points to unlock new privileges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
