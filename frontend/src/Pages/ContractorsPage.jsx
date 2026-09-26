import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaPhone, FaMapMarkerAlt, FaBriefcase, FaTools, FaTimes, FaEnvelope, FaCheckCircle, FaSearch, FaFilter } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ClientNavBar from '../components/ClientNavBar';
import Footer from '../components/Footer';

// Contractor Details Modal Component - Enhanced with better animations
const ContractorDetailsModal = ({ contractor, onClose }) => {
  const username = contractor.userId?.username || 'Unknown Contractor';
  const profilePic = contractor.userId?.profilePic 
    ? contractor.userId.profilePic.startsWith('http') 
      ? contractor.userId.profilePic 
      : `http://localhost:5000${contractor.userId.profilePic}`
    : null;

  // Get actual rating values
  const rating = contractor.averageRating || 0;
  const reviewCount = contractor.reviewCount || 0;
  const formattedRating = rating.toFixed(1);

  // Define animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 30, 
        stiffness: 300 
      } 
    },
    exit: { 
      opacity: 0, 
      y: 30, 
      scale: 0.95,
      transition: { duration: 0.2 } 
    }
  };

  return (
    <motion.div
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-t-2xl p-6 relative">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {profilePic ? (
                  <img 
                    src={profilePic} 
                    alt={username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // V-DOMXSS remediation: build the fallback element via safe DOM
                      // APIs (createElement/textContent) instead of interpolating the
                      // username into an innerHTML string, removing the injection sink
                      // even though only a single character was used previously.
                      const parent = e.target.parentElement;
                      e.target.remove();
                      parent.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-blue-600');
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full h-full flex items-center justify-center text-white text-3xl';
                      fallback.textContent = username.charAt(0).toUpperCase();
                      parent.appendChild(fallback);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </motion.div>
              <div>
                <motion.h2 
                  className="text-2xl font-bold text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {username}
                </motion.h2>
                {contractor.companyName && (
                  <motion.p 
                    className="text-lg text-blue-100"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {contractor.companyName}
                  </motion.p>
                )}
                <motion.div 
                  className="flex items-center mt-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center bg-white bg-opacity-30 px-2 py-0.5 rounded-md">
                    <FaStar className="text-yellow-300 mr-1" />
                    <span className="text-white font-medium">{formattedRating} ({reviewCount})</span>
                  </div>
                </motion.div>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="text-white hover:text-blue-100 bg-white bg-opacity-20 p-2 rounded-full"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaTimes className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          {/* Verification Badge */}
          {contractor.verified && (
            <motion.div 
              className="flex items-center text-green-600 mb-6 bg-green-50 p-2 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <FaCheckCircle className="mr-2" />
              <span className="font-medium">Verified Contractor</span>
            </motion.div>
          )}

          {/* Content sections with staggered animation */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                  delayChildren: 0.3
                }
              }
            }}
          >
            {/* Specializations */}
            <motion.div 
              className="mb-8 bg-gray-50 p-4 rounded-xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaTools className="text-blue-600 mr-2" />
                Specializations
              </h3>
              <div className="flex flex-wrap gap-2">
                {contractor.specialization?.map((spec, index) => (
                  <motion.span 
                    key={index}
                    className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      delay: 0.5 + (index * 0.05),
                      type: "spring",
                      stiffness: 300 
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: "#93C5FD" }}
                  >
                    {spec}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div 
              className="mb-8 bg-gray-50 p-4 rounded-xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaPhone className="text-blue-600 mr-2" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                  <FaPhone className="text-blue-500 mr-3" />
                  <span>{contractor.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                  <FaEnvelope className="text-blue-500 mr-3" />
                  <span>{contractor.userId?.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                  <FaMapMarkerAlt className="text-blue-500 mr-3" />
                  <span>{contractor.address || 'Location not specified'}</span>
                </div>
              </div>
            </motion.div>

            {/* Experience and Projects */}
            <motion.div 
              className="mb-8 bg-gray-50 p-4 rounded-xl"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <FaBriefcase className="text-blue-600 mr-2" />
                Experience
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-3xl font-bold text-blue-600">{contractor.experienceYears || 0}</div>
                  <div className="text-gray-600 mt-1">Years of experience</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-3xl font-bold text-blue-600">{contractor.completedProjects || 0}</div>
                  <div className="text-gray-600 mt-1">Projects completed</div>
                </div>
              </div>
            </motion.div>

            {/* Bio */}
            {contractor.bio && (
              <motion.div 
                className="mb-8 bg-gray-50 p-4 rounded-xl"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  About
                </h3>
                <p className="text-gray-600 leading-relaxed bg-white p-4 rounded-lg shadow-sm">
                  {contractor.bio}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex justify-end space-x-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Close
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "#2563EB" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toast.info('Contact functionality coming soon!')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg transition-colors shadow-md"
            >
              Contact Now
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Enhanced Contractor Card Component
const ContractorCard = ({ contractor }) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleViewDetails = () => {
    setShowModal(true);
  };

  // Get username from userId if available
  const username = contractor.userId?.username || 'Unknown Contractor';
  const profilePic = contractor.userId?.profilePic 
    ? contractor.userId.profilePic.startsWith('http') 
      ? contractor.userId.profilePic 
      : `http://localhost:5000${contractor.userId.profilePic}`
    : null;

  // Get actual rating values
  const rating = contractor.averageRating || 0;
  const reviewCount = contractor.reviewCount || 0;
  
  // Format the rating to one decimal place
  const formattedRating = rating.toFixed(1);

  return (
    <>
      <motion.div 
        className={`bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 ${
          isHovered ? 'shadow-xl border-blue-200' : ''
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ 
          y: -8,
          boxShadow: "0 25px 35px -5px rgba(0, 0, 0, 0.1), 0 10px 15px -5px rgba(0, 0, 0, 0.05)"
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        {/* Add a subtle gradient accent top border */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="p-5">
          <div className="flex items-start space-x-4">
            {/* Profile Image - with animated gradient background */}
            <motion.div 
              className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-100 shadow-md relative"
              whileHover={{ scale: 1.05 }}
            >
              {profilePic ? (
                <img 
                  src={profilePic} 
                  alt={username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // V-DOMXSS remediation: safe DOM construction instead of an
                    // innerHTML template-literal injection sink (see hero avatar above).
                    const parent = e.target.parentElement;
                    e.target.remove();
                    parent.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-blue-600');
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex items-center justify-center text-white text-2xl';
                    fallback.textContent = username.charAt(0).toUpperCase();
                    parent.appendChild(fallback);
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Animated pulse effect for verified contractors */}
              {contractor.verified && (
                <motion.div
                  className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-2 border-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  <FaCheckCircle className="text-white text-xs" />
                </motion.div>
              )}
            </motion.div>

            {/* Contractor Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">
                {username}
                {isHovered && (
                  <motion.span 
                    className="ml-2 inline-block"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    👋
                  </motion.span>
                )}
              </h3>
              
              {contractor.companyName && (
                <p className="text-sm text-gray-600">{contractor.companyName}</p>
              )}
              
              <div className="flex items-center mt-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + (index * 0.05) }}
                    >
                      <FaStar className={`${index < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'} ${
                        index === Math.floor(rating) && rating % 1 > 0 ? '!text-yellow-300' : ''
                      }`} />
                    </motion.div>
                  ))}
                </div>
                <span className="text-sm text-gray-700 ml-2">{formattedRating} ({reviewCount})</span>
              </div>
            </div>
          </div>

          {/* Specializations - with animated tags */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {contractor.specialization?.slice(0, 3).map((spec, index) => (
                <motion.span 
                  key={index}
                  className="bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (index * 0.1), type: "spring" }}
                  whileHover={{ 
                    scale: 1.05, 
                    backgroundColor: "#DBEAFE", 
                    transition: { duration: 0.1 } 
                  }}
                >
                  {spec}
                </motion.span>
              ))}
              {contractor.specialization?.length > 3 && (
                <motion.span
                  className="bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  +{contractor.specialization.length - 3} more
                </motion.span>
              )}
            </div>
          </div>

          {/* Additional Info with icons */}
          <motion.div 
            className="mt-4 grid grid-cols-2 gap-3 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
              <FaMapMarkerAlt className="text-blue-500 mr-2" />
              <span className="truncate">{contractor.address || 'Location not specified'}</span>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
              <FaBriefcase className="text-blue-500 mr-2" />
              <span>{contractor.experienceYears || 0} years experience</span>
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg">
              <FaTools className="text-blue-500 mr-2" />
              <span>{contractor.completedProjects || 0} projects completed</span>
            </div>
          </motion.div>

          {/* Bio Preview with animated reveal */}
          {contractor.bio && (
            <motion.div 
              className="mt-4 relative overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-lg">
                {contractor.bio}
              </p>
              {isHovered && (
                <motion.div 
                  className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                ></motion.div>
              )}
            </motion.div>
          )}

          {/* Action Buttons - improved with animations */}
          <motion.div 
            className="mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              onClick={handleViewDetails}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 px-4 rounded-lg font-medium transition-all shadow-md flex items-center justify-center w-full"
              whileHover={{ scale: 1.03, boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)" }}
              whileTap={{ scale: 0.97 }}
            >
              <span>View Details</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <ContractorDetailsModal
            contractor={contractor}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Enhanced ContractorsPage with modern UI and animations
const ContractorsPage = () => {
  const [contractors, setContractors] = useState([]);
  const [filteredContractors, setFilteredContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({ total: 0, verified: 0, specializations: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const contractorsPerPage = 6;

  // Available specializations and locations
  const specializations = [
    'All',
    'Electrical',
    'Plumbing',
    'Roofing',
    'Carpentry',
    'Masonry',
    'Painting',
    'Flooring',
    'Landscaping',
    'Interior Design'
  ];

  const locations = [
    'All',
    'Colombo',
    'Gampaha',
    'Kalutara',
    'Kandy',
    'Galle',
    'Matara',
    'Jaffna',
    'Anuradhapura',
    'Kurunegala'
  ];

  // Calculate unique specializations across all contractors
  const calculateStats = (contractors) => {
    const uniqueSpecs = new Set();
    let verifiedCount = 0;
    
    contractors.forEach(contractor => {
      if (contractor.verified) verifiedCount++;
      contractor.specialization?.forEach(spec => uniqueSpecs.add(spec));
    });
    
    setStats({
      total: contractors.length,
      verified: verifiedCount,
      specializations: uniqueSpecs.size
    });
  };

  // Fetch contractors
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/contractors');
        setContractors(response.data);
        setFilteredContractors(response.data);
        calculateStats(response.data);
      } catch (error) {
        console.error('Error fetching contractors:', error);
        toast.error('Failed to load contractors');
      } finally {
        setLoading(false);
      }
    };

    fetchContractors();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = [...contractors];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contractor => 
        (contractor.userId?.username && contractor.userId.username.toLowerCase().includes(query)) ||
        (contractor.companyName && contractor.companyName.toLowerCase().includes(query)) ||
        (contractor.address && contractor.address.toLowerCase().includes(query)) ||
        (contractor.bio && contractor.bio.toLowerCase().includes(query)) ||
        (contractor.specialization && contractor.specialization.some(spec => spec.toLowerCase().includes(query)))
      );
    }

    // Apply specialization filter
    if (selectedSpecialization !== 'All') {
      result = result.filter(contractor => 
        contractor.specialization?.includes(selectedSpecialization)
      );
    }

    // Apply location filter
    if (selectedLocation !== 'All') {
      result = result.filter(contractor => 
        contractor.address && contractor.address.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Apply sorting
    switch(sortBy) {
      case 'rating':
        result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'experience':
        result.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
        break;
      case 'projects':
        result.sort((a, b) => (b.completedProjects || 0) - (a.completedProjects || 0));
        break;
      case 'verified':
        // Put verified contractors first
        result.sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0));
        break;
      default:
        break;
    }

    setFilteredContractors(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [contractors, searchQuery, selectedSpecialization, selectedLocation, sortBy]);

  // Pagination
  const indexOfLastContractor = currentPage * contractorsPerPage;
  const indexOfFirstContractor = indexOfLastContractor - contractorsPerPage;
  const currentContractors = filteredContractors.slice(indexOfFirstContractor, indexOfLastContractor);
  const totalPages = Math.ceil(filteredContractors.length / contractorsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavBar /><br></br><br></br><br></br>
      {/* Hero section with animated particles background */}
      <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-900 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500 rounded-full opacity-20"></div>
          <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-500 rounded-full opacity-20"></div>
          <motion.div 
            className="absolute top-20 right-40 w-20 h-20 bg-blue-300 rounded-full opacity-10"
            animate={{ 
              y: [0, -30, 0],
              scale: [1, 1.2, 1] 
            }}
            transition={{ 
              repeat: Infinity,
              duration: 5,
              ease: "easeInOut"
            }}
          ></motion.div>
          <motion.div 
            className="absolute bottom-40 left-60 w-32 h-32 bg-indigo-300 rounded-full opacity-10"
            animate={{ 
              y: [0, 40, 0],
              scale: [1, 1.3, 1] 
            }}
            transition={{ 
              repeat: Infinity,
              duration: 7,
              ease: "easeInOut"
            }}
          ></motion.div>
        </div>
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h1 
              className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              Find Professional 
              <motion.span 
                className="bg-gradient-to-r from-blue-200 to-indigo-200 text-transparent bg-clip-text block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                Construction Contractors
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-blue-100 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.7 }}
            >
              Browse through our verified contractors and find the perfect match for your construction project
            </motion.p>
            
            {/* Stats counters */}
            <motion.div 
              className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.7 }}
            >
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <motion.div 
                  className="text-3xl font-bold text-black"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1, type: "spring" }}
                >
                  {stats.total}
                </motion.div>
                <div className="text-black text-sm mt-1">Contractors</div>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <motion.div 
                  className="text-3xl font-bold text-black"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, type: "spring" }}
                >
                  {stats.verified}
                </motion.div>
                <div className="text-black text-sm mt-1">Verified</div>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4">
                <motion.div 
                  className="text-3xl font-bold text-black"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3, type: "spring" }}
                >
                  {stats.specializations}
                </motion.div>
                <div className="text-black text-sm mt-1">Specializations</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Search bar - floating above content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8 relative z-10">
        <motion.div 
          className="bg-white rounded-xl shadow-xl p-4 md:p-6"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.5, type: "spring" }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search contractors by name, company, specialization..."
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                showFilters 
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaFilter className="mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </motion.button>
          </div>
          
          {/* Advanced filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 mt-6 border-t border-gray-100"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {/* Specialization Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                    >
                      {specializations.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                    >
                      {locations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="rating">Highest Rating</option>
                      <option value="experience">Most Experience</option>
                      <option value="projects">Most Projects</option>
                      <option value="verified">Verified First</option>
                    </select>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Results count and stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <motion.div 
          className="flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <h2 className="text-lg md:text-xl font-bold text-gray-800">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-7 w-48 rounded"></div>
            ) : (
              `Found ${filteredContractors.length} ${filteredContractors.length === 1 ? 'contractor' : 'contractors'}`
            )}
          </h2>
          
          {!loading && filteredContractors.length > 0 && (
            <p className="text-gray-500 text-sm">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </motion.div>
      </div>

      {/* Results */}
      <LayoutGroup>
        <motion.div 
          layout
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12"
        >
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="bg-white rounded-xl shadow-lg p-5 h-80"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="animate-pulse">
                    <div className="flex items-start space-x-4">
                      <div className="w-20 h-20 rounded-full bg-gray-200"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 bg-gray-200 rounded"></div>
                        <div className="h-8 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-20 bg-gray-200 rounded mt-4"></div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : filteredContractors.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentContractors.map((contractor, index) => (
                  <motion.div 
                    key={contractor._id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 260,
                      damping: 20
                    }}
                  >
                    <ContractorCard contractor={contractor} />
                  </motion.div>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div 
                  className="flex justify-center mt-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="inline-flex items-center space-x-1 rounded-md shadow-sm">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => paginate(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-l-md border ${
                        currentPage === 1 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } text-sm font-medium transition-colors`}
                    >
                      Previous
                    </motion.button>
                    
                    {/* Page numbers */}
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show limited page numbers with ellipsis for better UX
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <motion.button
                            key={pageNumber}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => paginate(pageNumber)}
                            className={`px-4 py-2 border ${
                              currentPage === pageNumber
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } text-sm font-medium transition-colors`}
                          >
                            {pageNumber}
                          </motion.button>
                        );
                      } else if (
                        (pageNumber === 2 && currentPage > 3) ||
                        (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        return <span key={pageNumber} className="px-2 py-2 text-gray-500">...</span>;
                      }
                      return null;
                    })}
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-r-md border ${
                        currentPage === totalPages 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      } text-sm font-medium transition-colors`}
                    >
                      Next
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div 
              className="text-center py-16 bg-white rounded-xl shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 text-gray-400 mb-6"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900">No contractors found</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">
                {(selectedSpecialization !== 'All' || selectedLocation !== 'All' || searchQuery) 
                  ? 'We couldn\'t find any contractors matching your criteria. Try adjusting your filters or search terms.'
                  : 'There are no contractors in our system at this time. Please check back later.'}
              </p>
              {(selectedSpecialization !== 'All' || selectedLocation !== 'All' || searchQuery) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialization('All');
                    setSelectedLocation('All');
                  }}
                  className="mt-6 inline-flex items-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Clear all filters
                </motion.button>
              )}
            </motion.div>
          )}
        </motion.div>
      </LayoutGroup>
      
      <Footer />
    </div>
  );
};

export default ContractorsPage;