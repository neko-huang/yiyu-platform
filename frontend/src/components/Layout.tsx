import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1" role="main">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          <p>益屿活动管理平台 &copy; 2026 · 让每一场活动都精彩纷呈</p>
        </div>
      </footer>
    </div>
  );
}
