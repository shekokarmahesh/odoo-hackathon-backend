import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      const socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected');
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      socketInstance.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
        setIsConnected(false);
      });

      // Listen for notifications
      socketInstance.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        toast.success(notification.message);
      });

      // Listen for real-time updates
      socketInstance.on('questionUpdated', (data) => {
        // Handle question updates
        console.log('Question updated:', data);
      });

      socketInstance.on('answerAdded', (data) => {
        // Handle new answers
        console.log('New answer:', data);
      });

      socketInstance.on('voteUpdated', (data) => {
        // Handle vote updates
        console.log('Vote updated:', data);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, token]);

  const value = {
    socket,
    isConnected,
    notifications,
    setNotifications,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
