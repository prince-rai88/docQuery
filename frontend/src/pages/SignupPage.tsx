import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { Spinner } from '../components/Spinner';

function formatSignupErrors(data: Record<string, string | string[]>): string {
  const messages: string[] = [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) {
      messages.push(...value);
    } else if (typeof value === 'string') {
      messages.push(value);
    }
  }
  return messages.join(' ');
}

export default function SignupPage() {
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.signup({ username, email, password });

      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      await login(formData);
    } catch (err: any) {
      if (err.response?.status === 400 && err.response.data) {
        setError(formatSignupErrors(err.response.data));
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,111,240,0.08)_0%,_transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 rounded-card bg-accent/20 border border-accent/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-3xl font-semibold text-ink tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Start chatting with your documents
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="card py-8 px-4 sm:px-8">
          {error && (
            <div className="mb-4 alert-error">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field text-sm"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary-block">
              {isSubmitting ? <Spinner className="w-5 h-5" /> : 'Sign up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="link-accent">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
