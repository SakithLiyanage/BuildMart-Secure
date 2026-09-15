import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaEdit, FaSignOutAlt, FaTrashAlt, FaMedal, FaBriefcase, FaStar, FaClock } from 'react-icons/fa';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion'; 
import Footer from '../components/Footer'; 
import ContractorUserNav from '../components/ContractorUserNav';
import EditContractorProfile from '../components/EditContractorProfile';
import QualificationsManager from '../components/QualificationsManager';
import EditUserDetails from '../components/EditUserDetails';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239CA3AF'%3E%3Cpath fill-rule='evenodd' d='M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

function ProfileImage({ profilePicPath, className = "", size = "medium" }) {
  const imgSrc = profilePicPath
    ? (profilePicPath.startsWith('http://') || profilePicPath.startsWith('https://') || profilePicPath.startsWith('data:'))
      ? profilePicPath 
      : `http://localhost:5000${profilePicPath.startsWith('/') ? '' : '/'}${profilePicPath}`
    : DEFAULT_AVATAR; 

  const sizeMap = {
    small: "h-10 w-10",
    medium: "h-16 w-16", 
    large: "h-20 w-20",
    xlarge: "h-24 w-24",
    xxlarge: "h-32 w-32"
  };
  
  const sizeClass = sizeMap[size] || "";
  
  const containerClasses = `${sizeClass} ${className} rounded-full overflow-hidden flex-shrink-0 bg-gray-50`;

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.5 }}
      className={containerClasses} 
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background placeholder with subtle pattern */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.2) 100%)"
        }}
      ></div>
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
              e.target.onerror = null;
              e.target.src = DEFAULT_AVATAR;
            }} 
          />
        </div>
      </div>
    </motion.div>
  );
}

const ContractorProfile = () => {
  // Personal info state - pre-populated from JWT token immediately to avoid delay or missing fields
  const [personalInfo, setPersonalInfo] = useState(() => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const decoded = jwtDecode(token);
        const nameParts = decoded.username ? decoded.username.split(' ') : ['', ''];
        return {
          firstName: nameParts[0] || decoded.name || decoded.username || '',
          lastName: nameParts.slice(1).join(' ') || '',
          username: decoded.username || decoded.name || '',
          email: decoded.email || '',
          password: '******',
          address: '',
          phone: '',
          profilePic: decoded.profilePic || null
        };
      }
    } catch (e) {}
    return {
      firstName: '',
      lastName: '', 
      username: '',
      email: '',
      password: '******',
      address: '',
      phone: '',
      profilePic: null
    };
  });

  // State for UI
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditUserDetails, setShowEditUserDetails] = useState(false);
  const [contractorInfo, setContractorInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); 
  const navigate = useNavigate();

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const [projectCounts, setProjectCounts] = useState({
    systemCount: 0,
    manualCount: 0,
    totalCount: 0,
    isLoading: false,
    error: null
  });

  const handleProfileUpdate = (updatedProfile) => {
    setContractorInfo(updatedProfile);
    setPersonalInfo(prev => ({
      ...prev,
      firstName: updatedProfile.firstName || prev.firstName,
      lastName: updatedProfile.lastName || prev.lastName,
      address: updatedProfile.address || prev.address,
      phone: updatedProfile.phone || prev.phone
    }));
    
    setShowEditProfile(false);
    toast.success("Profile updated successfully!");
  };
  
  const handleUserUpdate = (updatedUserData) => {
    setPersonalInfo(prev => ({
      ...prev,
      firstName: updatedUserData.firstName || prev.firstName,
      lastName: updatedUserData.lastName || prev.lastName,
      username: updatedUserData.username || prev.username,
      email: updatedUserData.email || prev.email
    }));
    
    setShowEditUserDetails(false);
    toast.success("Personal details updated successfully!");
    
    refreshProfilePicture();
  };

  useEffect(() => {
    fetchUserProfile();
    fetchContractorData();
    fetchProfilePicture();
    fetchPaymentHistory(); 
    fetchCompletedProjectsCount(); 
  }, []);

  const fetchCompletedProjectsCount = async () => {
    const userId = getUserId();
    if (!userId) return;
    
    setProjectCounts(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log("Fetching completed projects count from API...");
       const response = await axios.get(`http://localhost:5000/api/ongoingworks/completed-count/${userId}`);
      
      const { systemCount, manualCount, totalCount } = response.data;
      
      console.log("Project counts received:", { systemCount, manualCount, totalCount });
      
      setProjectCounts({
        systemCount,
        manualCount,
        totalCount,
        isLoading: false,
        error: null
      });
      
      if (contractorInfo) {
        setContractorInfo(prev => ({
          ...prev,
          completedProjects: totalCount,
          systemCompletedProjects: systemCount,
          manualCompletedProjects: manualCount
        }));
      }
      
    } catch (error) {
      console.error("Error fetching completed projects count:", error);
      setProjectCounts(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: "Failed to load project counts" 
      }));
    }
  };
  

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Get the authentication token 
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // Extract user ID from token or use from state
  const getUserId = () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const decoded = jwtDecode(token);
      return decoded.userId || decoded.id;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Fetch user profile data
  const fetchUserProfile = async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) {
      toast.error('Authentication required. Please log in again.');
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('User data response:', response.data);
      
      const userData = response.data?.user; 
      
      if (userData) {
        const nameParts = userData.username ? userData.username.split(' ') : ['', ''];
        
        setPersonalInfo(prev => ({
          ...prev,
          firstName: nameParts[0] || userData.username || prev.firstName,
          lastName: nameParts.slice(1).join(' ') || prev.lastName,
          username: userData.username || prev.username || '',
          email: userData.email || prev.email || '',
          password: '******',
          profilePic: userData.profilePic || prev.profilePic
        }));
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback: decode token to populate email and username
      try {
        const decoded = jwtDecode(token);
        setPersonalInfo(prev => ({
          ...prev,
          username: prev.username || decoded.username || decoded.name || '',
          email: prev.email || decoded.email || '',
          firstName: prev.firstName || decoded.username || '',
          profilePic: prev.profilePic || decoded.profilePic || null
        }));
      } catch (decodeErr) {
        console.warn('Token fallback decode failed:', decodeErr);
      }
      setError('Failed to load your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch contractor specific data
  const fetchContractorData = async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/api/contractors/user/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setContractorInfo(response.data);
      
      // Update personal info with contractor and populated user data
      const populatedUser = response.data?.userId;
      const isPopulatedObj = populatedUser && typeof populatedUser === 'object';
      const populatedUsername = isPopulatedObj ? populatedUser.username : '';
      const populatedEmail = isPopulatedObj ? populatedUser.email : '';
      const populatedPic = isPopulatedObj ? populatedUser.profilePic : null;

      setPersonalInfo(prev => {
        const effectiveUsername = prev.username || populatedUsername || '';
        const nameParts = effectiveUsername ? effectiveUsername.split(' ') : ['', ''];
        return {
          ...prev,
          firstName: prev.firstName || nameParts[0] || effectiveUsername,
          lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
          username: effectiveUsername,
          email: prev.email || populatedEmail || '',
          profilePic: prev.profilePic || populatedPic || null,
          address: response.data?.address || prev.address,
          phone: response.data?.phone || prev.phone
        };
      });
    } catch (error) {
      console.error("Error fetching contractor data:", error);
    }
  };

  // Fetch profile picture separately
  const fetchProfilePicture = async () => {
    const userId = getUserId();
    const token = getToken();
    if (!userId || !token) return;
    
    try {
      const response = await axios.get(`http://localhost:5000/auth/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.user && response.data.user.profilePic) {
        console.log('Profile picture fetched:', response.data.user.profilePic);
        
        setPersonalInfo(prev => ({
          ...prev,
          profilePic: response.data.user.profilePic
        }));
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  };

  const refreshProfilePicture = () => {
    fetchProfilePicture();
  };

  // Handle user logout
  const handleLogout = () => {
    // Remove auth tokens
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    
    // Show success message
    toast.success('Logged out successfully');
    
    // Redirect to login page
    navigate('/login');
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    const userId = getUserId();
    const token = getToken();
    
    if (!userId || !token) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5000/auth/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      toast.success('Your account has been deleted successfully');
      
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const fetchPaymentHistory = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setIsLoadingPayments(true);
      setPaymentError(null);
      
      const userId = getUserId();
      
      // Fetch payments for this contractor
      const response = await axios.get(`http://localhost:5000/api/payments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { userId: userId } 
      });
      
      // Check if response contains payments data
      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid payment data received:', response.data);
        setPaymentError('Failed to load payment history: Invalid data format');
        setPaymentHistory([]);
        return;
      }
      
        const userPayments = response.data.filter(payment => 
        payment.user && 
        (payment.user.userId === userId || payment.user.userId?.toString() === userId.toString())
      );
      
      const formattedPayments = userPayments.map(payment => ({
        id: payment._id,
        description: getPaymentDescription(payment),
        amount: `LKR ${payment.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
        date: new Date(payment.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        }),
        status: payment.status === 'completed' ? 'Completed' : 
                payment.status === 'pending' ? 'Pending' : 'Failed',
        paymentType: payment.paymentType || 'other',
        cardType: payment.cardType,
        lastFourDigits: payment.lastFourDigits
      }));
      
      console.log(`Found ${formattedPayments.length} payments for contractor ${userId}`);
      setPaymentHistory(formattedPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentError('Failed to load payment history. Please try again later.');
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const getPaymentDescription = (payment) => {
    if (payment.paymentType === 'milestone') {
      return `Milestone Payment for Project #${payment.workId?.toString().slice(-6).toUpperCase() || 'Unknown'}`;
    } else if (payment.paymentType === 'inventory') {
      return `Purchase - ${payment.order?.items.length || 0} items`;
    } else if (payment.paymentType === 'agreement_fee') {
      return 'Agreement Fee Payment';
    } else {
      return 'Payment';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <motion.div 
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.4 }}
        className="flex-grow bg-gradient-to-br from-gray-50 to-blue-50 pb-12"
      >
        <ContractorUserNav />
        
        <br /><br /><br /><br />
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-gradient-to-r from-[#002855] to-[#0057B7] text-white p-8 shadow-xl"
        >
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl font-bold mb-2">My Profile</h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-blue-200"
            >
              Manage your professional profile, qualifications, and track your success
            </motion.p>
          </div>
        </motion.div>

        {/* Add tab navigation buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="container mx-auto max-w-6xl px-4 mb-8"
        ><br></br>
          <div className="bg-white rounded-xl shadow-md p-2 flex space-x-2">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
            >
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('payments')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'payments' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
            >
              Payment History
            </button>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {showEditProfile && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="container mx-auto max-w-4xl px-4 py-8"
            >
              <EditContractorProfile 
                contractorData={contractorInfo} 
                onClose={() => setShowEditProfile(false)}
                onProfileUpdate={handleProfileUpdate}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {showEditUserDetails && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="container mx-auto max-w-4xl px-4 py-8"
            >
              <EditUserDetails 
                userData={personalInfo}
                onClose={() => setShowEditUserDetails(false)}
                onUserUpdate={handleUserUpdate}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Profile content */}
        <AnimatePresence>
          {!showEditProfile && !showEditUserDetails && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="container mx-auto max-w-6xl px-4 py-8"
            >
              {/* Show content based on active tab */}
              {activeTab === 'profile' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 
                  <motion.div 
                    variants={cardVariants}
                    className="md:col-span-1"
                  >
                    <motion.div 
                      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)" }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-50"
                    >
                      <div className="flex flex-col items-center mb-6">
                        {personalInfo.profilePic ? (
                          <ProfileImage 
                            profilePicPath={personalInfo.profilePic}
                            size="xxlarge"
                            className="mb-4 border-4 border-white shadow-lg"
                          />
                        ) : (
                          <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-32 h-32 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full overflow-hidden mb-4 flex items-center justify-center text-white shadow-lg"
                          >
                            <span className="text-4xl font-bold">
                              {personalInfo.firstName ? personalInfo.firstName.charAt(0).toUpperCase() : 
                               personalInfo.username ? personalInfo.username.charAt(0).toUpperCase() : 'C'}
                            </span>
                          </motion.div>
                        )}
                        <motion.h2 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-blue-800"
                        >
                          {(personalInfo.firstName || personalInfo.lastName) 
                            ? `${personalInfo.firstName} ${personalInfo.lastName}`.trim() 
                            : personalInfo.username 
                            ? personalInfo.username
                            : (typeof contractorInfo?.userId === 'object' && contractorInfo.userId?.username)
                            ? contractorInfo.userId.username
                            : 'Contractor'}
                        </motion.h2>
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="text-gray-600"
                        >
                          @{personalInfo.username 
                            || (typeof contractorInfo?.userId === 'object' && contractorInfo.userId?.username)
                            || 'contractor'}
                        </motion.p>

                        {contractorInfo?.verified && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mt-2 flex items-center bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path>
                            </svg>
                            Verified Professional
                          </motion.div>
                        )}
                      </div>
                      
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Contact Information</h3>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowEditUserDetails(true)}
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm bg-blue-50 px-3 py-1 rounded-md"
                          >
                            <FaEdit className="mr-1" />
                            Edit
                          </motion.button>
                        </div>
                        <ul className="space-y-4">
                          <motion.li 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center"
                          >
                            <span className="font-medium w-24 text-gray-600">Email:</span>
                            <span className="text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md flex-1 break-all">
                              {personalInfo.email 
                                || (typeof contractorInfo?.userId === 'object' && contractorInfo.userId?.email)
                                || "Not specified"}
                            </span>
                          </motion.li>
                          <motion.li 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex items-center"
                          >
                            <span className="font-medium w-24 text-gray-600">Phone:</span>
                            <span className="text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md flex-1">
                              {personalInfo.phone || "Not provided"}
                            </span>
                          </motion.li>
                          <motion.li 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="flex items-center"
                          >
                            <span className="font-medium w-24 text-gray-600">Address:</span>
                            <span className="text-gray-800 bg-gray-50 px-3 py-1.5 rounded-md flex-1">
                              {personalInfo.address || "Not provided"}
                            </span>
                          </motion.li>
                        </ul>
                        
                        {/* Action buttons */}
                        <motion.div 
                          variants={containerVariants}
                          className="mt-6 space-y-3"
                        >
                          <motion.button 
                            variants={cardVariants}
                            whileHover={{ scale: 1.02, backgroundColor: "#2563EB" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowEditProfile(true)}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-lg flex items-center justify-center shadow-md"
                          >
                            <FaEdit className="mr-2" />
                            Edit Professional Details
                          </motion.button>
                          <motion.button 
                            variants={cardVariants}
                            whileHover={{ scale: 1.02, backgroundColor: "#DC2626" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleLogout}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg flex items-center justify-center shadow-md"
                          >
                            <FaSignOutAlt className="mr-2" />
                            Logout
                          </motion.button>
                          
                          <motion.button 
                            variants={cardVariants}
                            whileHover={{ scale: 1.02, backgroundColor: "#F3F4F6" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-red-600 py-3 px-4 rounded-lg flex items-center justify-center shadow-sm"
                          >
                            <FaTrashAlt className="mr-2" />
                            Delete Account
                          </motion.button>
                        </motion.div>
                      </div>
                    </motion.div>
                  </motion.div>

                  <motion.div 
                    variants={cardVariants}
                    className="md:col-span-2"
                  >
                    {/* Professional Details */}
                    <motion.div 
                      whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.1)" }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-50"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">Professional Details</h3>
                        <div className="flex items-center">
                          {contractorInfo?.verified && (
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center mr-2">
                              <svg className="w-3 h-3 mr-1 text-green-700" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                              </svg>
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Name */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center mb-2">
                            <FaBriefcase className="text-blue-600 mr-2" />
                            <h4 className="text-sm font-medium text-gray-600">Company Name</h4>
                          </div>
                          <p className="text-gray-800 font-medium text-lg">
                            {contractorInfo?.companyName || "Not specified"}
                          </p>
                        </motion.div>
                        
                        {/* Experience Years */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center mb-2">
                            <FaClock className="text-blue-600 mr-2" />
                            <h4 className="text-sm font-medium text-gray-600">Years of Experience</h4>
                          </div>
                          <p className="text-gray-800 font-medium text-lg">
                            {contractorInfo?.experienceYears ? `${contractorInfo.experienceYears} years` : "Not specified"}
                          </p>
                        </motion.div>
                        
                        {/* Completed Projects */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center mb-2">
                            <FaMedal className="text-blue-600 mr-2" />
                            <h4 className="text-sm font-medium text-gray-600">Completed Projects</h4>
                            {projectCounts.isLoading && (
                              <div className="ml-2 w-4 h-4">
                                <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {projectCounts.error ? (
                            <div className="text-red-500 text-sm">{projectCounts.error}</div>
                          ) : (
                            <>
                              <p className="text-gray-800 font-medium text-lg">
                                {projectCounts.totalCount}
                              </p>
                              
                              <div className="mt-2 text-xs text-gray-500">
                                <div className="flex justify-between">
                                  
                                </div>
                                
                                
                              </div>
                            </>
                          )}
                        </motion.div>
                        
                        {/* Specialization */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-100"
                        >
                          <div className="flex items-center mb-2">
                            <FaStar className="text-blue-600 mr-2" />
                            <h4 className="text-sm font-medium text-gray-600">Specialization</h4>
                          </div>
                          {contractorInfo?.specialization?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {contractorInfo.specialization.map((specialty, index) => (
                                <motion.span 
                                  key={index} 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.5 + (index * 0.1) }}
                                  className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full"
                                >
                                  {specialty}
                                </motion.span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-600">No specializations added</p>
                          )}
                        </motion.div>
                      </div>
                      
                      {/* Bio */}
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6"
                      >
                        <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          About Me
                        </h4>
                        <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-5 rounded-xl border border-gray-100">
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap overflow-auto max-h-[200px] break-words">
                            {contractorInfo?.bio || "No bio information added yet. Edit your profile to add a description about yourself and your services."}
                          </p>
                        </div>
                      </motion.div>
                      
                      {/* Statistics */}
                      <motion.div 
                        variants={containerVariants}
                        className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <motion.div 
                          variants={cardVariants}
                          whileHover={{ y: -5, boxShadow: "0 10px 15px -5px rgba(59, 130, 246, 0.2)" }}
                          className="bg-gradient-to-br from-blue-50 to-indigo-100 p-5 rounded-xl border border-blue-100 text-center"
                        >
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-600">{contractorInfo?.completedProjects || 0}</p>
                          <p className="text-sm text-gray-600 mt-1">Completed Projects</p>
                        </motion.div>
                        <motion.div 
                          variants={cardVariants}
                          whileHover={{ y: -5, boxShadow: "0 10px 15px -5px rgba(16, 185, 129, 0.2)" }}
                          className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border border-green-100 text-center"
                        >
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-green-600 to-emerald-600">{contractorInfo?.experienceYears || 0}</p>
                          <p className="text-sm text-gray-600 mt-1">Years Experience</p>
                        </motion.div>
                        <motion.div 
                          variants={cardVariants}
                          whileHover={{ y: -5, boxShadow: "0 10px 15px -5px rgba(124, 58, 237, 0.2)" }}
                          className="bg-gradient-to-br from-purple-50 to-violet-100 p-5 rounded-xl border border-purple-100 text-center"
                        >
                          <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-purple-600 to-violet-600">{contractorInfo?.specialization?.length || 0}</p>
                          <p className="text-sm text-gray-600 mt-1">Specializations</p>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                    
                    {/* Qualifications section */}
                    <motion.div
                      variants={cardVariants}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-50"
                    >
                      <QualificationsManager userId={getUserId()} />
                    </motion.div>
                  </motion.div>
                </div>
              ) : activeTab === 'payments' && (
                <motion.div 
                  variants={cardVariants}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-blue-50"
                >
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">Payment History</h3>
                    <button
                      className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg hover:bg-blue-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      Export
                    </button>
                  </div>
                  
                  {isLoadingPayments ? (
                    <div className="flex items-center justify-center h-48 bg-white rounded-lg border border-gray-200">
                      <motion.svg 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-8 w-8 text-blue-600" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </motion.svg>
                    </div>
                  ) : paymentError ? (
                    <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-red-600">{paymentError}</p>
                      <button 
                        onClick={fetchPaymentHistory}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-lg p-10 text-center border border-dashed border-gray-300"
                    >
                      <div className="flex justify-center">
                        <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-xl font-medium text-gray-800 mt-5">No Payment History Yet</h3>
                      <p className="text-gray-600 mt-2 max-w-md mx-auto">
                        Your payment history will appear here once you receive payments for your projects or make purchases.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div 
                      variants={containerVariants}
                      className="bg-white rounded-lg shadow overflow-hidden"
                    >
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Card
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentHistory.map((payment, index) => (
                            <motion.tr 
                              key={payment.id} 
                              className="hover:bg-gray-50"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * index, duration: 0.3 }}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{payment.description}</div>
                                <div className="text-xs text-gray-500">{payment.id}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {payment.amount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  payment.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                                  payment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <span className="capitalize">{payment.cardType}</span>
                                  <span className="ml-1 text-xs">•••• {payment.lastFourDigits}</span>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 overflow-y-auto" 
              aria-labelledby="modal-title" 
              role="dialog" 
              aria-modal="true"
            >
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity" 
                  aria-hidden="true"
                  onClick={() => setShowDeleteConfirm(false)}
                ></motion.div>

                {/* Modal Panel */}
                <div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                >
                  <div className="bg-white px-6 pt-5 pb-6">
                    <div className="text-center">
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Your Account</h3>
                      <div className="mt-3">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete your account? All of your data including projects, bids, qualifications, and payment history will be permanently removed. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                    <button
                      whileHover={{ scale: 1.02, backgroundColor: "#DC2626" }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleDeleteAccount}
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Delete Account
                    </button>
                    <button
                      whileHover={{ scale: 1.02, backgroundColor: "#F9FAFB" }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
      </motion.div>

      <Footer />
    </div>
  );
};

export default ContractorProfile;