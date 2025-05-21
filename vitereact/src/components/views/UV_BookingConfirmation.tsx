import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";

interface ConfirmationData {
  appointment_id: string;
  organizer_username: string;
  slot_start: string;
  slot_end: string;
  meeting_type: string;
  invitee: {
    name: string;
    email: string;
  };
}

const defaultConfirmation: ConfirmationData = {
  appointment_id: "",
  organizer_username: "",
  slot_start: "",
  slot_end: "",
  meeting_type: "",
  invitee: {
    name: "",
    email: ""
  }
};

interface LocationState {
  confirmationData?: ConfirmationData;
}

/* 
 * Note: Ensure that the backend response is transformed to match the ConfirmationData interface, 
 * particularly mapping 'organizer_id' to 'organizer_username' if needed.
 */

const UV_BookingConfirmation: React.FC = () => {
  const location = useLocation();
  const { state } = location;
  const locationState = state as LocationState;
  const [confirmationData, setConfirmationData] = useState<ConfirmationData>(defaultConfirmation);
  const auth_state = useSelector((reduxState: any) => reduxState.auth_state);

  useEffect(() => {
    if (locationState?.confirmationData) {
      setConfirmationData(locationState.confirmationData);
    }
  }, [locationState]);

  return (
    <main className="max-w-3xl mx-auto p-6" role="main">
      <h1 className="text-3xl font-bold mb-6 text-center">Booking Confirmation</h1>
      
      {/* Optional personalized message if the user is authenticated */}
      {auth_state && auth_state.is_authenticated && auth_state.user && auth_state.user.name && (
        <p className="text-center text-lg mb-4">
          Welcome back, {auth_state.user.name}!
        </p>
      )}
      
      {confirmationData.appointment_id !== "" ? (
        <>
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="text-lg mb-4">
              Thank you <span className="font-semibold">{confirmationData.invitee.name}</span>, your appointment has been successfully booked.
            </p>
            <h2 className="text-xl font-semibold mb-3">Appointment Details</h2>
            <ul className="list-disc list-inside mb-4">
              <li>
                <span className="font-semibold">Appointment ID:</span> {confirmationData.appointment_id}
              </li>
              <li>
                <span className="font-semibold">Organizer:</span> {confirmationData.organizer_username}
              </li>
              <li>
                <span className="font-semibold">Meeting Type:</span> {confirmationData.meeting_type}
              </li>
              <li>
                <span className="font-semibold">Start Time:</span>{" "}
                {new Date(confirmationData.slot_start).toLocaleString()}
              </li>
              <li>
                <span className="font-semibold">End Time:</span>{" "}
                {new Date(confirmationData.slot_end).toLocaleString()}
              </li>
            </ul>
            <p className="mb-4">
              Please check your email (<span className="font-semibold">{confirmationData.invitee.email}</span>) for further confirmation details and instructions.
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link to="/" className="text-blue-500 hover:underline">
              Return to Home
            </Link>
          </div>
        </>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6">
          <p className="text-center">
            No booking confirmation details found. Please try booking again.
          </p>
          <div className="mt-4 text-center">
            <Link to="/" className="text-blue-500 hover:underline">
              Return to Home
            </Link>
          </div>
        </div>
      )}
    </main>
  );
};

export default UV_BookingConfirmation;