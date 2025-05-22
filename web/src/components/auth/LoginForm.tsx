import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Use the login function from auth context instead of direct API call
      await login(formData.email, formData.password);
      // After successful login, navigate to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />

      {/* Animated Glow Effects */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "10s" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-lg bg-black/40 backdrop-blur-xl border-slate-800 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 rounded-lg" />

          {/* Subtle animated highlight */}
          <div
            className="absolute -inset-1 bg-gradient-to-r from-violet-500/0 via-violet-500/20 to-fuchsia-500/0 blur-xl opacity-50"
            style={{
              transform: "translateX(-100%)",
              animation: "shimmer 5s infinite",
            }}
          />

          <div className="relative">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-0.5 shadow-lg shadow-violet-500/20">
                <div className="w-full h-full rounded-[14px] bg-black flex items-center justify-center backdrop-blur-xl">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                <span className="text-white">Welcome back to </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  StreamScale
                </span>
              </h1>
              <p className="text-slate-400">
                Sign in to your account to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-violet-400 transition-colors" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-11 bg-black/20 border-slate-800 text-white focus:border-violet-500 focus:ring-violet-500/20 transition-all"
                    required
                    aria-label="Email"
                    onKeyDown={handleKeyDown}
                    autoComplete="email"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-violet-400 transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-11 pr-11 bg-black/20 border-slate-800 text-white focus:border-violet-500 focus:ring-violet-500/20 transition-all"
                    required
                    aria-label="Password"
                    onKeyDown={handleKeyDown}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    tabIndex={0}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Demo Credentials Section */}
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 border border-violet-700 text-sm text-slate-300 font-mono space-y-1 select-text">
                <p className="font-semibold text-violet-400 mb-1">
                  Demo Credentials:
                </p>
                <p>
                  <span className="text-violet-300">Email:</span>{" "}
                  demo@streamscale.com
                </p>
                <p>
                  <span className="text-violet-300">Password:</span>{" "}
                  DemoPass123!
                </p>
                <p className="text-xs text-slate-500 mt-2 italic">
                  * Use these to try the app quickly
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-lg font-medium tracking-wide h-12 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="rounded border-slate-700 bg-black/20 text-violet-500 focus:ring-violet-500/20"
                  />
                  <label
                    htmlFor="remember"
                    className="text-slate-400 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                  tabIndex={0}
                  aria-label="Forgot password"
                >
                  Forgot password?
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-slate-400">
                Don't have an account?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                  tabIndex={0}
                  aria-label="Sign up"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Add CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
