import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/map', label: '地图', icon: '🗺️' },
  { path: '/ai-plan', label: 'AI策划', icon: '✨' },
  { path: '/sop', label: 'SOP模板', icon: '📋' },
  { path: '/achievements', label: '成就中心', icon: '🏆' },
];

const adminNavItems = [
  { path: '/dashboard', label: '仪表盘', icon: '📊' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 路由变化时关闭菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0" aria-label="益屿首页">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">益</span>
            </div>
            <span className="text-xl font-bold text-gray-800 hidden sm:block">益屿</span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1 flex-1 justify-center" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-1" aria-hidden="true">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
            {user?.role === 'admin' &&
              adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-1" aria-hidden="true">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 搜索图标入口 */}
            <Link
              to="/search"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="搜索活动"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* 创建活动按钮 */}
            <Link
              to="/events/create"
              className="btn-primary text-sm flex items-center gap-1 px-3 sm:px-4"
              aria-label="创建活动"
            >
              <span>+</span>
              <span className="hidden sm:inline">创建活动</span>
            </Link>

            {/* 已登录 → 头像下拉菜单 */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="用户菜单"
                  aria-expanded={menuOpen}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name || user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                    role="menu"
                  >
                    {/* 用户信息 */}
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="font-medium text-gray-900 text-sm truncate">{user.display_name || user.username}</p>
                      <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                    </div>

                    {/* 菜单项 */}
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <span>👤</span> 个人中心
                    </Link>
                    <Link
                      to="/my-events"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <span>📅</span> 我的活动
                    </Link>
                    <Link
                      to="/search"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <span>🔍</span> 搜索活动
                    </Link>
                    <Link
                      to="/achievements"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      role="menuitem"
                    >
                      <span>🏆</span> 成就中心
                    </Link>

                    {/* 分隔线 */}
                    <div className="border-t border-gray-50 my-1" />

                    {/* 退出登录 */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      role="menuitem"
                    >
                      <span>🚪</span> 退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* 未登录 → 登录/注册按钮 */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors px-3 py-1.5"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
