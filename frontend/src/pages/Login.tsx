import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/errors';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 优先使用 AuthContext 保存的重定向路径，其次使用 location state
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
    || sessionStorage.getItem('redirectAfterLogin')
    || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      await login({ username: username.trim(), password });
      // 登录成功后清除重定向路径
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, '登录失败，请检查用户名和密码'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">益</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">欢迎回来</h1>
          <p className="text-gray-500 mt-1">登录益屿，开启精彩活动之旅</p>
        </div>

        {/* Login form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="请输入用户名"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            还没有账号？
            <Link to="/register" className="text-primary-600 font-medium hover:underline ml-1">
              立即注册
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          益屿活动管理平台 · 让每一场活动都精彩纷呈
        </p>
      </div>
    </div>
  );
}
