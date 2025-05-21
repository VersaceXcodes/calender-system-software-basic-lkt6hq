import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/* Import Global Shared Views */
import GV_TopNav from '@/components/views/GV_TopNav';
import GV_Footer from '@/components/views/GV_Footer';
import GV_NotificationBar from '@/components/views/GV_NotificationBar';

/* Import Unique Views */
import UV_Landing from '@/components/views/UV_Landing';
import UV_Login from '@/components/views/UV_Login';
import UV_Register from '@/components/views/UV_Register';
import UV_PasswordReset from '@/components/views/UV_PasswordReset';
import UV_Profile from '@/components/views/UV_Profile';
import UV_AvailabilitySetup from '@/components/views/UV_AvailabilitySetup';
import UV_MeetingTypeConfig from '@/components/views/UV_MeetingTypeConfig';
import UV_OrganizerDashboard from '@/components/views/UV_OrganizerDashboard';
import UV_AppointmentDetails from '@/components/views/UV_AppointmentDetails';
import UV_PublicScheduling from '@/components/views/UV_PublicScheduling';
import UV_BookingForm from '@/components/views/UV_BookingForm';
import UV_BookingConfirmation from '@/components/views/UV_BookingConfirmation';
import UV_CancelAppointment from '@/components/views/UV_CancelAppointment';
import UV_RescheduleAppointment from '@/components/views/UV_RescheduleAppointment';

const App: React.FC = () => {
  const location = useLocation();

  // Get the authentication state from the Redux store
  const isAuthenticated = useSelector((state: any) => state.auth_state.is_authenticated);

  // Determine if GV_NotificationBar should be rendered based on authenticated routes.
  // GV_NotificationBar should be shown on:
  // - Organizer Dashboard (/dashboard)
  // - Profile (/profile)
  // - Availability Setup (/availability_setup)
  // - Meeting Type Config (/meeting_type_config)
  // - Appointment Details (/appointment/:appointment_id)
  const notificationPaths = ["/dashboard", "/profile", "/availability_setup", "/meeting_type_config"];
  const currentPath = location.pathname;
  const showNotificationBar =
    isAuthenticated &&
    (notificationPaths.some((prefix) => currentPath.startsWith(prefix)) ||
      currentPath.startsWith("/appointment/"));

  return (
    <>
      {/* Global Top Navigation is always visible at the top */}
      <GV_TopNav />
      
      {/* Main Content Area with Tailwind styling */}
      <div className="pt-16 min-h-screen flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-4">
          {/* Conditionally render the Global Notification Bar */}
          {showNotificationBar && <GV_NotificationBar />}
          
          <Routes>
            <Route path="/" element={<UV_Landing />} />
            <Route path="/login" element={<UV_Login />} />
            <Route path="/register" element={<UV_Register />} />
            <Route path="/password_reset" element={<UV_PasswordReset />} />
            <Route path="/profile" element={<UV_Profile />} />
            <Route path="/availability_setup" element={<UV_AvailabilitySetup />} />
            <Route path="/meeting_type_config" element={<UV_MeetingTypeConfig />} />
            <Route path="/dashboard" element={<UV_OrganizerDashboard />} />
            <Route path="/appointment/:appointment_id" element={<UV_AppointmentDetails />} />
            <Route path="/:username/book" element={<UV_BookingForm />} />
            <Route path="/booking_confirmation" element={<UV_BookingConfirmation />} />
            <Route path="/cancel_appointment" element={<UV_CancelAppointment />} />
            <Route path="/reschedule_appointment" element={<UV_RescheduleAppointment />} />
            <Route path="/:username" element={<UV_PublicScheduling />} />
          </Routes>
        </main>
        
        {/* Global Footer is always visible at the bottom */}
        <GV_Footer />
      </div>
    </>
  );
};

export default App;