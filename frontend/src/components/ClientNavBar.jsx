import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaUserCircle, FaChevronDown, FaChartBar, 
  FaCog, FaSignOutAlt, FaPlus 
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';
import logo from "../assets/images/buildmart_logo1.png";
import { CarTaxiFront, ShoppingCartIcon } from 'lucide-react';
import AddJobForm from './AddJobForm';

// Import ProfileImage component from Userprofile.jsx
function ProfileImage({ profilePicPath, className = "", size = "medium" }) {
  // Check if the path is a full URL or just a relative path
  const imgSrc = profilePicPath
    ? profilePicPath.startsWith('http') 
      ? profilePicPath 
      : `http://localhost:5000${profilePicPath}`
    : '/default-profile.png'; // Fallback image

  // Size map with expanded options
  const sizeMap = {
    tiny: "h-8 w-8",
    small: "h-10 w-10",
    medium: "h-16 w-16", 
    large: "h-20 w-20",
    xlarge: "h-24 w-24",
    xxlarge: "h-32 w-32"
  };
  
  // Get size class or default to passed dimensions
  const sizeClass = sizeMap[size] || "";
  
  // Combine size with passed className
  const containerClasses = `${sizeClass} ${className} rounded-full overflow-hidden flex-shrink-0 bg-gray-50`;

  return (
    <div className={containerClasses} style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Background placeholder with subtle pattern */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.2) 100%)"
        }}
      ></div>
      {/* Perfect circle mask with aspect ratio enforcement */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative' 
        }}>
          <img 
            src={imgSrc} 
            alt="Profile" 
            className="absolute inset-0 w-full h-full rounded-full"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            onError={(e) => {
              e.target.src = '/default-profile.png';
              console.log("Failed to load profile image:", profilePicPath);
            }} 
          />
        </div>
      </div>
    </div>
  );
}

const ClientNavBar = () => {
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  
  // Track scroll position for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Handle clicks outside user menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if user is logged in on component mount
  useEffect(() => {
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (token) {
      try {
        // Clear old legacy placeholder tokens
        if (token.includes('placeholder')) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          setUser(null);
          return;
        }

        // Decode the token to get user data
        const decoded = jwtDecode(token);
        
        if (!decoded || typeof decoded !== 'object') {
          throw new Error('Invalid token structure');
        }

        const fallbackName = decoded.username || decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User');
        
        // Create a user object from the decoded token
        const userData = {
          _id: decoded.userId || decoded.id,
          username: fallbackName,
          email: decoded.email || '',
          role: decoded.role || 'Client',
          profilePic: decoded.profilePic || null
        };
        
        // Set the user state
        setUser(userData);
      } catch (error) {
        console.warn("Error decoding token, clearing stale session:", error);
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
        setUser(null);
      }
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    // Remove user data
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    sessionStorage.removeItem("user");
    
    // Remove token
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    
    // Reset user state
    setUser(null);
    
    // Redirect to login page
    navigate("/login");
  };

  const handleJobAdded = (newJob) => {
    // You can implement any additional logic here when a job is added
    console.log("New job added:", newJob);
    // Close the form
    setShowAddJobForm(false);
    // Show a success message
    alert('Job created successfully!');
  };

  return (
    <>
      <nav 
        className={`fixed w-full backdrop-blur-md py-3 px-4 md:px-8 flex items-center justify-between transition-all duration-500 z-50 ${
          isScrolled ? "bg-white/90 shadow-lg" : "bg-white/50"
        }`}
      >
        <div className="flex items-center">
          <Link to="/">
            <img src={logo} alt="BuildMart" className="h-12 md:h-16" />
          </Link>
        </div>
        
        <div className="hidden lg:flex items-center space-x-6">
          {['Home', 'Shop', 'Ongoing Projects'].map((item, index) => (
            <Link 
              key={index}
              to={item === 'Home' ? '/' : 
                  item === 'Ongoing Projects' ? '/ongoing-works' : 
                  `/${item.toLowerCase().replace(' ', '-')}`} 
              className={`relative py-2 px-1 ${
                window.location.pathname === (
                  item === 'Home' ? '/' : 
                  item === 'Ongoing Projects' ? '/ongoing-works' : 
                  `/${item.toLowerCase().replace(' ', '-')}`
                ) ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
            >
              {item}
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${
                window.location.pathname === (
                  item === 'Home' ? '/' : 
                  item === 'Ongoing Projects' ? '/ongoing-works' : 
                  `/${item.toLowerCase().replace(' ', '-')}`
                ) ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
            </Link>
          ))}
          
          {/* Add Contractors Link */}
          <Link 
            to="/contractors"
            className={`relative py-2 px-1 ${
              window.location.pathname === '/contractors' 
                ? 'text-blue-600' 
                : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            Contractors
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${
              window.location.pathname === '/contractors' 
                ? 'scale-x-100' 
                : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          {/* Add Job Link After Ongoing Projects */}
          {user && (
            <button
              onClick={() => setShowAddJobForm(true)}
              className="relative py-2 px-1 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-300 group flex items-center"
            >
              
              Add New Job
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
            </button>
          )}

          {['About Us', 'Contact Us'].map((item, index) => (
            <Link 
              key={index}
              to={`/${item.toLowerCase().replace(' ', '-')}`} 
              className={`relative py-2 px-1 ${
                window.location.pathname === (
                  `/${item.toLowerCase().replace(' ', '-')}`
                ) ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
            >
              {item}
              <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${
                window.location.pathname === (
                  `/${item.toLowerCase().replace(' ', '-')}`
                ) ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
            </Link>
          ))}
          
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <div 
                className="flex items-center space-x-2 cursor-pointer bg-gradient-to-r from-blue-50 to-gray-100 py-2 px-4 rounded-full border border-gray-200 hover:shadow-md transition-all"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user.profilePic ? (
                  <ProfileImage 
                    profilePicPath={user.profilePic}
                    size="tiny" 
                    className="border-2 border-blue-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white">
                    {(user.username || user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-gray-800 font-medium">Hi, {user.username || user.name || 'User'}</span>
                <FaChevronDown className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </div>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="font-medium text-gray-800">{user.email}</p>
                    </div>
                    
                    <Link 
                      to="/userprofile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <span className="w-8"><FaUserCircle /></span>
                      Profile
                    </Link>

                    <Link 
                      to="/my-orders"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    >
                      <span className="w-8"><ShoppingCartIcon /></span>
                      My orders
                    </Link>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span className="w-8"><FaSignOutAlt /></span>
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link to="/login">
                <button className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Log in
                </button>
              </Link>
              <Link to="/signup">
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-full hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none">
                  Sign Up
                </button>
              </Link>
            </div>
          )}
        </div>
        
        <div className="lg:hidden">
          <button 
            className="text-gray-700 focus:outline-none p-2"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-[74px] left-0 w-full bg-white z-40 shadow-lg lg:hidden overflow-hidden"
          >
            <div className="p-5 flex flex-col space-y-4">
              {['Home', 'Shop', 'Ongoing Projects'].map((item, index) => (
                <Link 
                  key={index}
                  to={item === 'Home' ? '/' : 
                      item === 'Ongoing Projects' ? '/ongoing-works' : 
                      `/${item.toLowerCase().replace(' ', '-')}`} 
                  className={`py-2 px-4 ${
                    window.location.pathname === (
                      item === 'Home' ? '/' : 
                      item === 'Ongoing Projects' ? '/ongoing-works' : 
                      `/${item.toLowerCase().replace(' ', '-')}`
                    ) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'} rounded-lg transition-colors duration-300`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {item}
                </Link>
              ))}

              {/* Add Job Link in Mobile Menu */}
              {user && (
                <button
                  onClick={() => {
                    setShowAddJobForm(true);
                    setShowMobileMenu(false);
                  }}
                  className="py-2 px-3 rounded-lg hover:bg-blue-50 text-blue-600 font-medium flex items-center"
                >
                  <FaPlus className="mr-2" />
                  Add New Job
                </button>
              )}
              
              {['About Us', 'Contact Us'].map((item, index) => (
                <Link 
                  key={index}
                  to={`/${item.toLowerCase().replace(' ', '-')}`} 
                  className={`py-2 px-3 rounded-lg ${
                    window.location.pathname === `/${item.toLowerCase().replace(' ', '-')}` 
                    ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {item}
                </Link>
              ))}
              
              {!user ? (
                <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
                  <Link to="/login" onClick={() => setShowMobileMenu(false)}>
                    <button className="w-full py-2 px-4 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors">
                      Log in
                    </button>
                  </Link>
                  <Link to="/signup" onClick={() => setShowMobileMenu(false)}>
                    <button className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      Sign Up
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    {user.profilePic ? (
                      <ProfileImage 
                        profilePicPath={user.profilePic}
                        size="small" 
                        className="border-2 border-blue-500"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg">
                        {(user.username || user.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.username || user.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <Link 
                      to="/userprofile"
                      className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-700"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <span className="w-8"><FaUserCircle /></span>
                      Profile
                    </Link>
                    
                    <Link 
                      to="/settings"
                      className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-700"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <span className="w-8"><FaCog /></span>
                      Settings
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center py-2 px-3 rounded-lg hover:bg-red-50 text-red-600 mt-2"
                    >
                      <span className="w-8"><FaSignOutAlt /></span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Job Form Modal */}
      <AnimatePresence>
        {showAddJobForm && (
          <AddJobForm 
            onClose={() => setShowAddJobForm(false)} 
            onJobAdded={handleJobAdded} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ClientNavBar;