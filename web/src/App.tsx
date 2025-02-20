import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import VideoList from "@/components/dashboard/VideoList";
import VideoUpload from "@/components/dashboard/VideoUpload";
import VideoDetails from "@/components/dashboard/VideoDetails";
import VideoPlayer from "@/components/dashboard/VideoPlayer";
import LandingPage from "@/components/landing/LandingPage";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          <PublicRoute>
            <LoginForm />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupForm />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<VideoList />} />
          <Route path="upload" element={<VideoUpload />} />
          <Route path="video/:videoId" element={<VideoDetails />} />
          <Route path="play/:videoId" element={<VideoPlayer />} />
        </Route>

        {/* Catch all route - redirect to dashboard if logged in, otherwise to login */}
        <Route path="*" element={
          <Navigate to="/dashboard" replace />
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
