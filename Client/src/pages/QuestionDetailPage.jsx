import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { questionService, answerService, voteService } from '../services';
import { Card, Button, Avatar, Badge, LoadingSpinner } from '../components/ui';
import { formatDate, formatNumber } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

const QuestionDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuestionDetails();
  }, [id]);

  const fetchQuestionDetails = async () => {
    try {
      setLoading(true);
      const [questionResponse, answersResponse] = await Promise.all([
        questionService.getById(id),
        answerService.getByQuestion(id)
      ]);

      if (questionResponse.success) {
        setQuestion(questionResponse.data);
      }
      if (answersResponse.success) {
        setAnswers(answersResponse.data.answers);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (targetId, targetType, voteType) => {
    if (!isAuthenticated) return;
    
    try {
      await voteService.vote(targetId, targetType, voteType);
      // Refresh data
      fetchQuestionDetails();
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-red-600">Error loading question: {error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Question */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          {/* Vote buttons */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => handleVote(question._id, 'question', 'upvote')}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
              disabled={!isAuthenticated}
            >
              ▲
            </button>
            <span className="text-lg font-medium">{formatNumber(question.voteScore)}</span>
            <button
              onClick={() => handleVote(question._id, 'question', 'downvote')}
              className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
              disabled={!isAuthenticated}
            >
              ▼
            </button>
          </div>

          {/* Question content */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{question.title}</h1>
            <div className="prose max-w-none mb-4">
              <p>{question.description}</p>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {question.tags?.map((tag) => (
                <Badge key={tag._id} variant="primary">{tag.name}</Badge>
              ))}
            </div>

            {/* Author info */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Avatar src={question.author?.profile?.avatar} alt={question.author?.username} size="sm" />
                <span>
                  asked by <strong>{question.author?.username}</strong> {formatDate(question.createdAt)}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span>{formatNumber(question.views)} views</span>
                <span>{formatNumber(question.answerCount)} answers</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Answers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">
          {answers?.length || 0} Answer{(answers?.length || 0) !== 1 ? 's' : ''}
        </h2>
        
        {answers?.map((answer) => (
          <Card key={answer._id} className="p-6">
            <div className="flex gap-4">
              {/* Vote buttons */}
              <div className="flex flex-col items-center space-y-2">
                <button
                  onClick={() => handleVote(answer._id, 'answer', 'upvote')}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  disabled={!isAuthenticated}
                >
                  ▲
                </button>
                <span className="text-lg font-medium">{formatNumber(answer.voteScore)}</span>
                <button
                  onClick={() => handleVote(answer._id, 'answer', 'downvote')}
                  className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                  disabled={!isAuthenticated}
                >
                  ▼
                </button>
                {answer.isAccepted && (
                  <div className="text-green-600">✓</div>
                )}
              </div>

              {/* Answer content */}
              <div className="flex-1">
                <div className="prose max-w-none mb-4">
                  <p>{answer.content}</p>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Avatar src={answer.author?.profile?.avatar} alt={answer.author?.username} size="sm" />
                  <span>
                    answered by <strong>{answer.author?.username}</strong> {formatDate(answer.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Answer form (if authenticated) */}
      {isAuthenticated && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            rows="6"
            placeholder="Write your answer here..."
          />
          <Button>Post Your Answer</Button>
        </Card>
      )}
    </div>
  );
};

export default QuestionDetailPage;
