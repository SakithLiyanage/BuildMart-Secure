import React, { useState } from 'react';
import './App.css'
import BidForm from './components/BidForm'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Home from './Pages/Home'
import NoPage from './Pages/NoPage'
import ProjectDetails from './Pages/ProjectDetails'
import Login from './Pages/login'
import SignUp from './Pages/Signup'
import Shop from './Pages/shop'
import Payment from './components/Payment'
import ShippingTracking from './Pages/ShippingTracking'
import AuctionsPage from './Pages/AuctionsPage'
import ContractorProfile from './Pages/ContractorPage'
import Contact from './Pages/Contact'
import About from './Pages/About'
import Admindashboard from './Pages/Admindashboard'
import ClientContractorAgreement from './Pages/ClientContractorAgreement'
import PaymentDashboard from './Pages/PaymentDashboard'
import UserProfile from './Pages/UserProfile'
import ActiveJob from './Pages/ActiveJob'
import OngoingJobs from './Pages/Ongoingworks'
import BiddingHistoryPage from './components/BiddingHistory'
import ContractorProfileSetup from './components/ContractorOnboarding'
import ContractorViewDetails from './components/ContractorViewDetails'
import BidUpdate from './components/BidUpdate'
import AgreementForm from './Pages/AgreementForm'
import OngoingProjects from './components/OngoingProjects'
import InventoryDash from './Pages/InventoryDash'
import Supply_LogisticDashboard from './Pages/Supply_LogisticDashboard'
import AcceptedAgreementView from './components/AcceptedAgreementView';
import { SupplierPaymentProvider } from './context/SupplierPaymentContext';
import EnhancedPaymentGateway from './components/Payment';
import InitialPayment from './components/InitialPayment'
import MyOrders from './Pages/MyOrders'
import ContractorsPage from './Pages/ContractorsPage'
import MyEarningsPage from './Pages/MyEarningsPage'

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const sampleData = {
    shipmentId: "123456",
    shipmentStatus: "Out for Delivery",
    deliveryProgress: 75, // Progress percentage (e.g., 75%)
    estimatedDelivery: "Friday, October 27, 2023",
  };

  const samplebid = {
    id: '123',
    title: 'Residential Kitchen Renovation',
    description: 'Complete renovation of a 200 sq ft kitchen including cabinets, countertops, and electrical work',
    budget: 'RS:3000 - RS:8000',
    minBid: 3000,
    maxBid: 8000,
    endTime: '2025-03-16T08:05:33 GMT+08:00',
    bids: []
  }

  const sampleProjectData = {
    title: "Office Renovation",
    description: "Complete renovation of the main office space including new flooring, lighting, and furniture.",
    budget: "RS:5000 - RS:10000",
    endTime: "2025-03-20T08:00:00",
    contractorName: "ABC Construction",
    yourBid: 7500,
    timeline: 30,
    experience: 5,
    additionalDetails: "Specialized in modern office renovations with 5+ years of experience working on similar projects."
  };

  return (
    <SupplierPaymentProvider>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path='/bid-form/:jobId' element={<BidForm
        sampleData={sampleProjectData}
        />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/project-details" element={<ProjectDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/Shop" element={<Shop />} />
        <Route path="/payment" element={<Payment />} />
        <Route path='/bidhistory' element={<BiddingHistoryPage />} />
        <Route path="/shippingtracking" element={<ShippingTracking
          shipmentId={sampleData.shipmentId}
          shipmentStatus={sampleData.shipmentStatus}
          deliveryProgress={sampleData.deliveryProgress}
          estimatedDelivery={sampleData.estimatedDelivery}
        />  } />
        <Route path='/aggreement' element={<ClientContractorAgreement />} />
        <Route path='/auction' element={<AuctionsPage />} />
        {/* Fallback route */}
        <Route path="/contact-us" element={<Contact />} />
        <Route path="/admindashboard" element={<Admindashboard />} />
        <Route path="/about-us" element={<About />} />
        <Route path="/paymentdashboard" element={<PaymentDashboard />} />
        <Route path="*" element={<NoPage />} />
        <Route path="/contractor-profile" element={<ContractorProfile />} />
        <Route path="/userprofile" element={<UserProfile />} />
        <Route path="/job/:jobId" element={<ActiveJob />} />
        <Route path="/project/:jobId" element={<ProjectDetails />} />
        <Route path="/activejobs" element={<ActiveJob />} />
        <Route path="/contractorStart" element={<ContractorProfileSetup />} />
        <Route path="/ongoingproject" element={<OngoingProjects />} />
          
        <Route path='/contractor/:contractorId/bid/:bidId/project/:projectId' element= {<ContractorViewDetails/>} />

        <Route path="/bids/:bidId/update" element={<BidUpdate />} />
        <Route path="/ongoing-works" element={<OngoingJobs />} />
        <Route path="/agreement/:jobId/:bidId" element={<AgreementForm />} />
        <Route path="/inventoryDash" element={<InventoryDash />} />
        <Route path="/supply-logistics" element={<Supply_LogisticDashboard />} />
        <Route 
          path="/accepted-agreement/:jobId/:bidId" 
          element={<AcceptedAgreementView />} 
        />
        <Route 
          path="/payment-gateway" 
          element={
            <EnhancedPaymentGateway 
              onSuccess={(paymentResult) => {
                // Handle successful payment
                const { state } = location;
                if (state?.returnUrl) {
                  navigate(state.returnUrl);
                }
              }}
              onCancel={() => {
                // Handle payment cancellation
                const { state } = location;
                if (state?.returnUrl) {
                  navigate(state.returnUrl);
                }
              }}
            />
          } 
        />
        
        <Route path="/contractors" element={<ContractorsPage />} />
        <Route path='/my-orders' element={<MyOrders />} />
        <Route path="/payment/:jobId/:bidId" element={<InitialPayment />} />
        <Route path="/my-earnings" element={<MyEarningsPage />} />
      </Routes>
    </SupplierPaymentProvider>
  )
}

export default App
