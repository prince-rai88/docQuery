import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import ChatPage from './pages/ChatPage';

const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas p-8 animate-pulse">
        <div className="max-w-6xl mx-auto">
          <div className="skeleton h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`card p-6 ${i === 1 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                <div className="skeleton h-5 w-3/4 mb-4" />
                <div className="skeleton h-4 w-1/2 mb-6" />
                <div className="flex gap-3">
                  <div className="skeleton h-12 flex-1 rounded-card" />
                  <div className="skeleton h-12 w-24 rounded-card" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="documents/:id/chat" element={<ChatPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
