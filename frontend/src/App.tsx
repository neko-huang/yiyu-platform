import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// 路由级懒加载，减少首屏包体积
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EventManage = lazy(() => import('./pages/EventManage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const AIPlan = lazy(() => import('./pages/AIPlan'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));

/** 全局加载占位符 */
function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-500" />
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* 公开路由（无 Layout） */}
      <Route path="/login" element={<Suspense fallback={<PageLoading />}><Login /></Suspense>} />
      <Route path="/register" element={<Suspense fallback={<PageLoading />}><Register /></Suspense>} />

      {/* 公开路由（有 Layout，不需要登录） */}
      <Route element={<Layout />}>
        <Route path="/search" element={<Suspense fallback={<PageLoading />}><SearchPage /></Suspense>} />
        <Route path="/users/:userId" element={<Suspense fallback={<PageLoading />}><PublicProfilePage /></Suspense>} />
      </Route>

      {/* 需要登录的路由 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Suspense fallback={<PageLoading />}><Home /></Suspense>} />
        <Route path="/events/:id" element={<Suspense fallback={<PageLoading />}><EventDetail /></Suspense>} />
        <Route path="/events/create" element={<Suspense fallback={<PageLoading />}><CreateEvent /></Suspense>} />
        <Route path="/events/:id/manage" element={<Suspense fallback={<PageLoading />}><EventManage /></Suspense>} />
        <Route path="/map" element={<Suspense fallback={<PageLoading />}><MapPage /></Suspense>} />
        <Route path="/ai-plan" element={<Suspense fallback={<PageLoading />}><AIPlan /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoading />}><ProfilePage /></Suspense>} />

        {/* 管理端路由 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<PageLoading />}><Dashboard /></Suspense>
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 兜底 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
