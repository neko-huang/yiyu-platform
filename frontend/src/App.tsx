import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

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
const SOPPage = lazy(() => import('./pages/SOPPage'));
const AlbumPage = lazy(() => import('./pages/AlbumPage'));
const DiscussionPage = lazy(() => import('./pages/DiscussionPage'));
const AchievementPage = lazy(() => import('./pages/AchievementPage'));
const MyEventsPage = lazy(() => import('./pages/MyEventsPage'));

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
    <ErrorBoundary>
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
        <Route path="/sop" element={<Suspense fallback={<PageLoading />}><SOPPage /></Suspense>} />
        <Route path="/events/:id/album" element={<Suspense fallback={<PageLoading />}><AlbumPage /></Suspense>} />
        <Route path="/events/:id/discussion" element={<Suspense fallback={<PageLoading />}><DiscussionPage /></Suspense>} />
        <Route path="/achievements" element={<Suspense fallback={<PageLoading />}><AchievementPage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoading />}><ProfilePage /></Suspense>} />
        <Route path="/my-events" element={<Suspense fallback={<PageLoading />}><MyEventsPage /></Suspense>} />

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
    </ErrorBoundary>
  );
}

export default App;
