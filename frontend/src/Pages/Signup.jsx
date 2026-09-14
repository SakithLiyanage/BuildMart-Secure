import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaUser } from "react-icons/fa"; // For password visibility toggle and avatar fallback
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion"; // For animations
import logo from '../assets/images/buildmart_logo1.png'; 
import axios from 'axios'; // Importing Axios for API requests
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // FIXED: Use named import with curly braces

const SignUp = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState("Client"); // Default role is 'Client'
  const [profilePic, setProfilePic] = useState(null); // State to hold the profile picture
  const [profilePreview, setProfilePreview] = useState(null); // New state for preview only
  const [username, setUsername] = useState(""); // State for username
  const [email, setEmail] = useState(""); // State for email
  const [password, setPassword] = useState(""); // State for password
  const [confirmPassword, setConfirmPassword] = useState(""); // State for confirm password
  const [errorMessage, setErrorMessage] = useState(""); // State to handle error messages
  
  // Google OAuth states
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState("");

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const navigate = useNavigate();

  // Initialize Google Identity Services for Signup
  useEffect(() => {
    const initializeGoogleGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "68910139905-l2tf7aavt0b4p4ufqves9dqi7o77kud1.apps.googleusercontent.com",
          callback: handleGoogleSignupResponse,
          auto_select: false
        });

        const googleBtnContainer = document.getElementById("googleSignUpBtn");
        if (googleBtnContainer) {
          window.google.accounts.id.renderButton(googleBtnContainer, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signup_with"
          });
        }
      }
    };

    const timer = setTimeout(initializeGoogleGSI, 500);
    return () => clearTimeout(timer);
  }, []);

  // Google OAuth Signup response handler
  const handleGoogleSignupResponse = (response) => {
    try {
      const idToken = response.credential;
      setGoogleIdToken(idToken);
      setIsGoogleAuth(true);

      const decodedGoogle = jwtDecode(idToken);
      if (decodedGoogle.email) setEmail(decodedGoogle.email);
      if (decodedGoogle.name) {
        setUsername(decodedGoogle.name.replace(/[^a-zA-Z0-9_]/g, '_'));
      }
      if (decodedGoogle.picture) {
        setProfilePreview(decodedGoogle.picture);
      }
      setErrorMessage("");
    } catch (err) {
      console.error("Google credential decode error:", err);
      setErrorMessage("Failed to read Google profile data.");
    }
  };

  // Handle file input change (profile picture upload)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const isUsernameValid = validateUsername(true);
    const isEmailValid = validateEmail(true);

    // When Google Auth is used, password is optional unless user typed a password
    let isPasswordValid = true;
    let isConfirmPasswordValid = true;
    if (!isGoogleAuth || password.length > 0 || confirmPassword.length > 0) {
      isPasswordValid = validatePassword(true);
      isConfirmPasswordValid = validateConfirmPassword(true);
    }
    
    let isProfilePicValid = true;
    if (profilePic) {
      if (profilePic.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          profilePic: 'Profile picture must be less than 5MB'
        }));
        isProfilePicValid = false;
      }
      
      const fileType = profilePic.type;
      if (!fileType.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        setErrors(prev => ({
          ...prev,
          profilePic: 'File must be an image (JPG, PNG, or WebP)'
        }));
        isProfilePicValid = false;
      }
    }
    
    return isUsernameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid && isProfilePicValid;
  };

  const validateUsername = (showError = attemptedSubmit) => {
    if (username.trim().length < 3) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          username: 'Username must be at least 3 characters'
        }));
      }
      return false;
    } else {
      setErrors(prev => ({ ...prev, username: '' }));
      return true;
    }
  };

  const validateEmail = (showError = attemptedSubmit) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address'
        }));
      }
      return false;
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
      return true;
    }
  };

  const validatePassword = (showError = attemptedSubmit) => {
    // If Google SSO is active and password is empty, it is valid as optional
    if (isGoogleAuth && !password) {
      setErrors(prev => ({ ...prev, password: '' }));
      return true;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    
    if (!password) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          password: 'Password is required'
        }));
      }
      return false;
    } else if (!passwordRegex.test(password)) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          password: 'Password must be at least 8 characters with at least one letter and one number'
        }));
      }
      return false;
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
      return true;
    }
  };

  const validateConfirmPassword = (showError = attemptedSubmit) => {
    // If Google SSO is active and both password fields are blank, valid
    if (isGoogleAuth && !password && !confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
      return true;
    }

    if (!confirmPassword) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Please confirm your password'
        }));
      }
      return false;
    } else if (password !== confirmPassword) {
      if (showError) {
        setErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
      }
      return false;
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
      return true;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setErrorMessage("");
    
    if (!validateForm()) {
      const firstErrorElement = document.querySelector('.text-red-500');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Handle Google OAuth registration completion
    if (isGoogleAuth) {
      try {
        let res;
        if (profilePic) {
          const formData = new FormData();
          formData.append('idToken', googleIdToken);
          formData.append('role', selectedRole);
          formData.append('username', username.trim());
          if (password) {
            formData.append('password', password);
          }
          formData.append('profilePic', profilePic);

          // Let browser and Axios automatically assign Content-Type with boundary
          res = await axios.post('http://localhost:5000/auth/google', formData);
        } else {
          // Send direct JSON to avoid multipart overhead
          res = await axios.post('http://localhost:5000/auth/google', {
            idToken: googleIdToken,
            role: selectedRole,
            username: username.trim(),
            password: password || undefined
          });
        }

        const token = res.data.token;
        localStorage.setItem('token', token);

        const decoded = jwtDecode(token);
        const userRole = decoded.role;

        if (userRole === "Service Provider") {
          localStorage.setItem('contractorProfileComplete', 'false');
          navigate('/contractorStart');
        } else {
          navigate('/');
        }
        return;
      } catch (err) {
        console.error("Google sign up error:", err);
        const errorText = err.response?.data?.error 
          || err.response?.data?.message 
          || (err.message ? `Registration failed: ${err.message}` : "Google registration failed. Please try again.");
        setErrorMessage(errorText);
        return;
      }
    }

    // Standard registration with email/password
    const formData = new FormData();
    formData.append('username', username.trim());
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('role', selectedRole);
    
    if (profilePic) {
      formData.append('profilePic', profilePic);
    }

    try {
      const response = await axios.post('http://localhost:5000/auth/signup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const token = response.data.token || response.data.accessToken;
      localStorage.setItem('token', token);
      
      const decoded = jwtDecode(token);
      const userRole = decoded.role;
      
      if (userRole === "Service Provider") {
        localStorage.setItem('contractorProfileComplete', 'false');
        navigate('/contractorStart');
      } else {
        navigate('/');
      }

      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setProfilePic(null);
      setSelectedRole('Client');
    } catch (error) {
      console.error('Error during signup:', error.response ? error.response.data : error.message);
      setErrorMessage(error.response?.data?.error || error.response?.data?.message || 'Signup failed! Please try again.');
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
          {/* Left Side - Sign Up Form */}
          <div className="w-full md:w-1/2 p-12 space-y-6">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl font-bold text-gray-800 mb-2"
            >
              Sign Up
            </motion.h1>
            <p className="text-sm text-gray-500 mb-2">
              Create an account or fast-track with Google Single Sign-On
            </p>

            {/* Google OAuth Signup Button */}
            {!isGoogleAuth && (
              <div className="space-y-3">
                <div id="googleSignUpBtn" className="w-full flex justify-center min-h-[40px]"></div>
                
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase font-semibold">Or fill form manually</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </div>
            )}

            {/* Google Account Verified Notice */}
            {isGoogleAuth && (
              <div className="p-3 bg-blue-50 border border-blue-300 text-blue-900 rounded-lg text-sm flex items-center justify-between">
                <div>
                  <span className="font-semibold">✓ Google Account Connected:</span> Complete your role and account details below to finish registration.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleAuth(false);
                    setGoogleIdToken("");
                    setEmail("");
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                    setProfilePreview(null);
                    setProfilePic(null);
                  }}
                  className="text-xs text-red-600 hover:text-red-800 underline ml-2 font-medium"
                >
                  Clear
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {attemptedSubmit && (errors.username || errors.email || errors.password || errors.confirmPassword || errors.profilePic) && (
                <div className="p-3 border border-red-300 bg-red-50 text-red-700 rounded-md mb-4 text-sm animate-fadeIn">
                  <p className="font-medium">Please fix the following errors:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {errors.username && <li>{errors.username}</li>}
                    {errors.email && <li>{errors.email}</li>}
                    {errors.password && <li>{errors.password}</li>}
                    {errors.confirmPassword && <li>{errors.confirmPassword}</li>}
                    {errors.profilePic && <li>{errors.profilePic}</li>}
                  </ul>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-400 text-red-700 rounded-md mb-4 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Role Selection */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Register as
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("Client")}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                      selectedRole === "Client"
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("Service Provider")}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                      selectedRole === "Service Provider"
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white text-blue-600 border border-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    Service Provider
                  </button>
                </div>
              </motion.div>

              {/* User Name */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (attemptedSubmit) validateUsername(true);
                  }}
                  onBlur={() => validateUsername(true)}
                  className={`w-full px-4 py-2.5 border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md`}
                  placeholder="Enter username"
                  required
                />
                {errors.username && <div className="text-red-500 text-sm mt-1">{errors.username}</div>}
              </motion.div>

              {/* Email Address */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly={isGoogleAuth}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (attemptedSubmit) validateEmail(true);
                  }}
                  onBlur={() => validateEmail(true)}
                  className={`w-full px-4 py-2.5 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md ${
                    isGoogleAuth ? 'bg-gray-100 cursor-not-allowed text-gray-700' : ''
                  }`}
                  placeholder="Enter email address"
                  required
                />
                {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
              </motion.div>

              {/* Passwords (Kept for all registration flows; optional when authenticated with Google) */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Password {isGoogleAuth && <span className="text-xs text-blue-600 font-normal ml-1">(Optional - to enable password sign-in)</span>}
                </label>
                <div className="relative">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (attemptedSubmit) validatePassword(true);
                    }}
                    onBlur={() => validatePassword(true)}
                    className={`w-full px-4 py-2.5 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md`}
                    placeholder={isGoogleAuth ? "Optional password (min. 8 characters)" : "Enter password"}
                    required={!isGoogleAuth}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-500"
                  >
                    {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mb-4"
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Confirm Password {isGoogleAuth && <span className="text-xs text-blue-600 font-normal ml-1">(Optional)</span>}
                </label>
                <div className="relative">
                  <input
                    type={confirmPasswordVisible ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (attemptedSubmit) validateConfirmPassword(true);
                    }}
                    onBlur={() => validateConfirmPassword(true)}
                    className={`w-full px-4 py-2.5 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-md`}
                    placeholder={isGoogleAuth ? "Confirm optional password" : "Confirm password"}
                    required={!isGoogleAuth && password.length > 0}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-500"
                  >
                    {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.confirmPassword && <div className="text-red-500 text-sm mt-1">{errors.confirmPassword}</div>}
              </motion.div>

              {/* Submit Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                type="submit"
                className={`w-full py-3 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 hover:shadow-xl font-medium mt-2 ${
                  isGoogleAuth
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : attemptedSubmit && (errors.username || errors.email || errors.password || errors.confirmPassword)
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#002855] hover:bg-blue-700 text-white'
                }`}
              >
                {isGoogleAuth
                  ? `Complete Registration as ${selectedRole}`
                  : attemptedSubmit && (errors.username || errors.email || errors.password || errors.confirmPassword)
                  ? 'Please Fix Validation Errors'
                  : 'Register'}
              </motion.button>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-500 hover:underline transition-all duration-300">
                    Sign In
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Right Side - Profile Image Upload */}
          <div className="hidden md:flex w-1/2 text-white p-12 flex-col justify-center items-center">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative w-28 h-28 flex justify-center items-center"
            >
              <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-800 border-2 border-blue-400/40 shadow-xl flex justify-center items-center">
                {profilePreview ? (
                  <img 
                    src={profilePreview} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath fill-rule='evenodd' d='M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  <FaUser className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2.5 cursor-pointer shadow-lg hover:bg-blue-700 transition-colors z-10">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <img src="https://img.icons8.com/ios/50/ffffff/upload.png" alt="Upload" width="18px" />
              </label>
            </motion.div>
            <p className="text-xs text-gray-400 mt-2">Upload Profile Photo (Optional)</p>
            {errors.profilePic && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm mt-1 text-center"
              >
                {errors.profilePic}
              </motion.p>
            )}

            {/* Logo below Profile Picture */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-20"
            >
              <img
                src={logo} 
                alt="Site Logo"
                className="w-80 h-auto" 
              />
            </motion.div>
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

export default SignUp;
