import { useState, useEffect } from 'react';
import { questionService } from '../services';
import { useAuth } from '../contexts/AuthContext';

export const useQuestions = (filters = {}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalQuestions: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchQuestions = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await questionService.getAll({ 
        page, 
        limit: 10, 
        ...filters 
      });
      
      if (response.success) {
        setQuestions(response.data);
        setPagination(response.meta);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [JSON.stringify(filters)]);

  const refetch = () => fetchQuestions(pagination.currentPage);
  const nextPage = () => fetchQuestions(pagination.currentPage + 1);
  const prevPage = () => fetchQuestions(pagination.currentPage - 1);
  const goToPage = (page) => fetchQuestions(page);

  return {
    questions,
    loading,
    error,
    pagination,
    refetch,
    nextPage,
    prevPage,
    goToPage,
  };
};
