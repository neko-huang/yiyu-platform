import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import CreateEvent from './pages/CreateEvent';
import EventManage from './pages/EventManage';
import MapPage from './pages/MapPage';
import AIPlan from './pages/AIPlan';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 需要登录的路由 */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/events/create" element={<CreateEvent />} />
        <Route path="/events/:id/manage" element={<EventManage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/ai-plan" element={<AIPlan />} />
        <Route path="/profile" element={<Profile />} />

        {/* 管理端路由 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <Dashboard />
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
