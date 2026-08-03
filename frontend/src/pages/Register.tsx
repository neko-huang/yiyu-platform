import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../utils/errors';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // 前端表单验证
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('请填写所有必填字段');
      return;
    }

    // 简单邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setLoading(true);

    try {
      await register({ username: username.trim(), email: email.trim(), password });
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, '注册失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">益</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">创建账号</h1>
          <p className="text-gray-500 mt-1">加入益屿，发现更多精彩活动</p>
        </div>

        {/* Register form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-1.5">用户名</label>
              <input
                id="reg-username"
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
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="请输入邮箱地址"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="至少6位字符"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
              <input
                id="reg-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="请再次输入密码"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? '注册中...' : '注 册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            已有账号？
            <Link to="/login" className="text-primary-600 font-medium hover:underline ml-1">
              返回登录
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
