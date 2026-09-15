import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaUserCircle, FaBriefcase, FaHistory, FaChartLine, FaCog, FaSignOutAlt, FaGavel, FaSearch, FaMoneyBillWave, FaShoppingCart } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { toast } from 'react-toastify';
import logo from "../assets/images/buildmart_logo1.png";
import { motion, AnimatePresence } from 'framer-motion';

const ContractorUserNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);

  const getProfileImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return `http://localhost:5000${path.startsWith('/') ? '' : '/'}${path}`;
  };

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }
        
        const decoded = jwtDecode(token);
        const userId = decoded.userId || decoded.id;
        
        const response = await axios.get(`http://localhost:5000/auth/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUserData(response.data.user);
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            const decoded = jwtDecode(token);
            setUserData({
              username: decoded.name || decoded.username || 'User',
              email: decoded.email || ''
            });
          }
        } catch (err) {
          console.error('Error decoding token:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('userId');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (loading) {
    return (
      <nav className="fixed w-full backdrop-blur-md py-3 px-4 md:px-8 flex items-center justify-between transition-all duration-500 z-50 bg-white/90">
        <div className="flex items-center">
          <Link to="/">
            <img src={logo} alt="BuildMart" className="h-12 md:h-16" />
          </Link>
        </div>
        <div className="w-6 h-6 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
      </nav>
    );
  }

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
          <Link 
            to="/auction" 
            className={`relative py-2 px-1 ${isActive('/auction') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            <FaGavel className="inline mr-1" /> Auction
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/auction') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
  <Link 
    to="/shop" 
    className={`relative py-2 px-1 ${isActive('/shop') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
  ></Link>

          <Link 
            to="/bidhistory" 
            className={`relative py-2 px-1 ${isActive('/bidhistory') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            <FaHistory className="inline mr-1" /> Bid History
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/bidhistory') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          <Link 
            to="/ongoingproject" 
            className={`relative py-2 px-1 ${isActive('/ongoingproject') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            <FaChartLine className="inline mr-1" /> Ongoing Projects
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/ongoingproject') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          <Link 
            to="/shop" 
            className={`relative py-2 px-1 ${isActive('/shop') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            <FaShoppingCart className="inline mr-1" /> Shop
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/shop') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          <Link 
            to="/about-us" 
            className={`relative py-2 px-1 ${isActive('/about-us') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            About Us
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/about-us') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          <Link 
            to="/contact-us" 
            className={`relative py-2 px-1 ${isActive('/contact-us') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'} font-medium transition-colors duration-300 group`}
          >
            Contact Us
            <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 transform origin-left scale-x-0 transition-transform duration-300 ${isActive('/contact-us') ? 'scale-x-100' : 'group-hover:scale-x-100'}`}></span>
          </Link>
          
          <div className="relative" ref={dropdownRef}>
            <div 
              className="flex items-center space-x-2 cursor-pointer bg-gradient-to-r from-blue-50 to-gray-100 py-2 px-4 rounded-full border border-gray-200 hover:shadow-md transition-all"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {userData?.profilePic && !imgError ? (
                <img
                  src={getProfileImageUrl(userData.profilePic)}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-blue-500 object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(userData?.username)}
                </div>
              )}
              <span className="text-gray-800 font-medium">Hi, {userData?.username}</span>
              <svg 
                className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            
            <AnimatePresence>
              {showDropdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm text-gray-500">Signed in as</p>
                    <p className="font-medium text-gray-800">{userData?.email || 'Contractor'}</p>
                  </div>
                  
                  <Link 
                    to="/contractor-profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className="w-8"><FaUserCircle /></span>
                    Profile
                  </Link>
                  
                  <Link 
                    to="/my-earnings" 
                    className="flex items-center px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md"
                  >
                    <FaMoneyBillWave className="mr-2" />
                    My Earnings
                  </Link>
                  
                  <Link 
                    to="/my-orders" 
                    className="flex items-center px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md"
                  >
                    <FaShoppingCart className="mr-2" />
                    My Orders
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
        </div>
        
        <div className="lg:hidden">
          <button 
            className="text-gray-700 focus:outline-none p-2"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showDropdown ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-[74px] left-0 w-full bg-white z-40 shadow-lg lg:hidden overflow-hidden"
          >
            <div className="p-5 flex flex-col space-y-4">
              <Link 
                to="/auction" 
                className={`py-2 px-3 rounded-lg ${isActive('/auction') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                onClick={() => setShowDropdown(false)}
              >
                <FaGavel className="inline mr-2" /> Auction
              </Link>
              
              <Link 
                to="/bidhistory" 
                className={`py-2 px-3 rounded-lg ${isActive('/bidhistory') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                onClick={() => setShowDropdown(false)}
              >
                <FaHistory className="inline mr-2" /> Bid History
              </Link>
              
              <Link 
                to="/ongoingproject" 
                className={`py-2 px-3 rounded-lg ${isActive('/ongoingproject') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                onClick={() => setShowDropdown(false)}
              >
                <FaChartLine className="inline mr-2" /> Ongoing Projects
              </Link>
              
              <Link 
                to="/about-us" 
                className={`py-2 px-3 rounded-lg ${isActive('/about-us') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                onClick={() => setShowDropdown(false)}
              >
                About Us
              </Link>
              
              <Link 
                to="/contact-us" 
                className={`py-2 px-3 rounded-lg ${isActive('/contact-us') ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} font-medium`}
                onClick={() => setShowDropdown(false)}
              >
                Contact Us
              </Link>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  {userData?.profilePic && !imgError ? (
                    <img
                      src={getProfileImageUrl(userData.profilePic)}
                      alt=""
                      className="w-10 h-10 rounded-full border-2 border-blue-500 object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {getInitials(userData?.username)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{userData?.username}</p>
                    <p className="text-sm text-gray-500">{userData?.email || 'Contractor'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <Link 
                    to="/contractor-profile"
                    className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-700"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className="w-8"><FaUserCircle /></span>
                    Profile
                  </Link>
                  <Link 
                    to="/settings"
                    className="flex items-center py-2 px-3 rounded-lg hover:bg-gray-100 text-gray-700"
                    onClick={() => setShowDropdown(false)}
                  >
                    <span className="w-8"><FaCog /></span>
                    Settings
                  </Link>
                  
                  <Link 
                    to="/my-earnings" 
                    className="flex items-center px-4 py-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-md"
                  >
                    <FaMoneyBillWave className="mr-2" />
                    My Earnings
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="flex items-center py-2 px-3 rounded-lg hover:bg-red-50 text-red-600 mt-2"
                  >
                    <span className="w-8"><FaSignOutAlt /></span>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ContractorUserNav;