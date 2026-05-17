/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { SubmitListing } from './pages/SubmitListing';
import { Listings } from './pages/Listings';
import { ListingDetails } from './pages/ListingDetails';
import { Messages } from './pages/Messages';
import { SellerDashboard } from './pages/SellerDashboard';
import { CompletedOrders } from './pages/CompletedOrders';
import { Disclaimer } from './pages/Disclaimer';
import { Contact } from './pages/Contact';
import { Admin } from './pages/Admin';
import { AdminPromotions } from './pages/AdminPromotions';
import { AdminVerifications } from './pages/AdminVerifications';
import { AuthProvider } from './context/AuthContext';
import { Profile } from './pages/Profile';

import { FAQs } from './pages/FAQs';
import { Support } from './pages/Support';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { WhyUs } from './pages/WhyUs';
import { VerifiedProfiles } from './pages/VerifiedProfiles';
import { Promotions } from './pages/Promotions';
import { PublicProfile } from './pages/PublicProfile';
import { ScrollToTop } from './components/ScrollToTop';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="submit" element={<SubmitListing />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/:id" element={<ListingDetails />} />
            <Route path="messages" element={<Messages />} />
            <Route path="dashboard" element={<SellerDashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="user/:id" element={<PublicProfile />} />
            <Route path="verified" element={<VerifiedProfiles />} />
            <Route path="my-listings" element={<SellerDashboard />} />
            <Route path="completed" element={<CompletedOrders />} />
            <Route path="disclaimer" element={<Disclaimer />} />
            <Route path="contact" element={<Contact />} />
            <Route path="support" element={<Support />} />
            <Route path="promotions" element={<Promotions />} />
            <Route path="why-us" element={<WhyUs />} />
            <Route path="faqs" element={<FAQs />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="admin" element={<Admin />} />
            <Route path="admin/promotions" element={<AdminPromotions />} />
            <Route path="admin/verifications" element={<AdminVerifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
