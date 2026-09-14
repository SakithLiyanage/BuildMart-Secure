import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // For password visibility toggle
import { FcGoogle } from "react-icons/fc"; // Google icon
import { motion } from "framer-motion"; // For animations
import signin_img from '../assets/images/signin_pic.png';
import axios from "axios";
import { useNavigate } from "react-router-dom"; // For redirection after login
import { jwtDecode } from "jwt-decode"; // Use curly braces for named export

const Login = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailUsername, setEmailUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const navigate = useNavigate();

  const handleRoleNavigation = (role) => {
    if (role === "Admin") {
      navigate('/admindashboard');
    } else if (role === "Service Provider") {
      navigate('/auction');
    } else {
      navigate('/');
    }
  };

  // Process token storage & role redirection
  const handleAuthSuccess = (token) => {
    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }

    try {
      const decoded = jwtDecode(token);
      const userRole = decoded.role;
      handleRoleNavigation(userRole);
    } catch (decodeErr) {
      console.warn("Could not decode token payload, defaulting to home:", decodeErr);
      navigate('/');
    }
  };

  // Google OAuth 2.0 / OpenID Connect Credential Handler
  const handleGoogleCredentialResponse = async (response) => {
    setGoogleLoading(true);
    setError("");
    try {
      const idToken = response.credential;
      const res = await axios.post('http://localhost:5000/auth/google', {
        idToken
      });

      if (res.data && res.data.token) {
        handleAuthSuccess(res.data.token);
      } else {
        setError("Google authentication failed to return access token");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || "Google authentication failed";
      setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Google Identity Services if available
  useEffect(() => {
    const initializeGoogleGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "102838382910-mockbuildmartoauth.apps.googleusercontent.com",
          callback: handleGoogleCredentialResponse,
          auto_select: false
        });

        const googleBtnContainer = document.getElementById("googleSignInBtn");
        if (googleBtnContainer) {
          window.google.accounts.id.renderButton(googleBtnContainer, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with"
          });
        }
      }
    };

    // Retry initialization if script loads asynchronously
    const timer = setTimeout(initializeGoogleGSI, 500);
    return () => clearTimeout(timer);
  }, [rememberMe]);

  // Standard Form Submission (Remediated: removed hardcoded credentials backdoor)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!emailUsername || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Secure authenticated login strictly via backend API
      const response = await axios.post('http://localhost:5000/auth/login', {
        emailUsername: emailUsername.trim(),
        password
      });
      
      const token = response.data.token;
      handleAuthSuccess(token);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setError("Invalid username/email or password");
        } else if (error.response.status === 404) {
          setError("User not found");
        } else if (error.response.status === 429) {
          setError("Too many login attempts. Please wait 15 minutes before trying again.");
        } else {
          setError("Login failed: " + (error.response.data.error || error.response.data.message || "Please check credentials"));
        }
      } else if (error.request) {
        setError("No response from server. Please verify backend is running on port 5000.");
      } else {
        setError("Login failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-[#002855] to-[#0057B7]">
      {/* Main Content */}
      <div className="flex flex-1 justify-center items-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex max-w-7xl w-full shadow-2xl rounded-3xl overflow-hidden bg-white"
        >
          {/* Left Side - Login Form */}
          <div className="w-full md:w-1/2 p-12 space-y-6">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold text-gray-800 mb-2"
            >
              Sign In
            </motion.h1>
            <p className="text-sm text-gray-500 mb-4">
              Enter your credentials or use Single Sign-On (Google OAuth 2.0 / OpenID Connect)
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {/* Google OAuth 2.0 / OpenID Connect Button Container */}
            <div className="space-y-3">
              <div id="googleSignInBtn" className="w-full flex justify-center min-h-[40px]"></div>
              
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-semibold">Or sign in with email</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Username or email address
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md"
                  placeholder="Enter username or email"
                  value={emailUsername}
                  onChange={(e) => setEmailUsername(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-500 transition-all duration-300"
                  >
                    {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    className="w-4 h-4 mr-2 rounded focus:ring-blue-500 transition-all duration-300"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="rememberMe" className="text-sm text-gray-600">Remember me</label>
                </div>
                <a
                  href="/forgot-password"
                  className="text-sm text-blue-500 hover:underline transition-all duration-300"
                >
                  Lost your password?
                </a>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                type="submit"
                className="w-full bg-[#002855] text-white py-3 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-xl font-medium"
                disabled={loading || googleLoading}
              >
                {loading ? "Signing In..." : "Sign In with Password"}
              </motion.button>

              {/* Sign Up link */}
              <div className="pt-2 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <a href="/signup" className="text-blue-500 font-medium hover:underline transition-all duration-300">
                    Sign Up
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Right Side - Graphic Banner */}
          <div className="hidden md:flex text-white p-0 flex-col justify-center space-y-1">
            <img src={signin_img} alt="construction" className="object-cover h-full" />
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-blue-900 text-white p-4 text-center">
        <div className="flex justify-center space-x-8">
          <a href="#" className="text-white hover:underline transition-all duration-300">
            About Us
          </a>
          <a href="#" className="text-white hover:underline transition-all duration-300">
            Register to bid
          </a>
          <a href="#" className="text-white hover:underline transition-all duration-300">
            Terms & Conditions
          </a>
          <a href="#" className="text-white hover:underline transition-all duration-300">
            Privacy Policy
          </a>
        </div>
        <p className="mt-4 text-xs">© 2025 BuildMart. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;