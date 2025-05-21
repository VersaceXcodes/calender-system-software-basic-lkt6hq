import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration: number;
}

interface Invitee {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

interface AppointmentDetails {
  id: string;
  meeting_type: MeetingType;
  slot_start: string;
  slot_end: string;
  status: string;
  invitee: Invitee;
  cancellation_token?: string;
}

const UV_AppointmentDetails: React.FC = () => {
  // Get appointment_id from route parameters
  const { appointment_id } = useParams<{ appointment_id: string }>();

  // Get authentication state from Redux store
  const auth = useSelector((state: any) => state.auth_state);
  
  // Local state for appointment details, loading and error
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // If no appointment_id is provided, set error
    if (!appointment_id) {
      setError("No appointment ID provided in URL.");
      setLoading(false);
      return;
    }

    // Function to fetch appointment details by calling GET /appointments/{appointment_id}
    const fetchAppointmentDetails = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/appointments/${appointment_id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${auth.auth_token}`
            }
          }
        );
        if (response.status === 200 && response.data) {
          setAppointmentDetails(response.data);
        } else {
          setError("Failed to fetch appointment details.");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching appointment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointment_id, auth.auth_token]);

  return (
    <>
      {loading ? (
        <div className="text-center py-8">
          <p className="text-xl font-medium">Loading appointment details...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600 text-lg">{error}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      ) : appointmentDetails ? (
        <div className="max-w-3xl mx-auto bg-white shadow rounded p-6">
          <h1 className="text-2xl font-bold mb-4">Appointment Details</h1>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Meeting Type</h2>
            <p className="mb-1">
              <span className="font-medium">Name:</span> {appointmentDetails.meeting_type.name}
            </p>
            <p className="mb-1">
              <span className="font-medium">Description:</span> {appointmentDetails.meeting_type.description}
            </p>
            <p>
              <span className="font-medium">Duration:</span> {appointmentDetails.meeting_type.duration} minutes
            </p>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Schedule</h2>
            <p className="mb-1">
              <span className="font-medium">Start:</span>{" "}
              {new Date(appointmentDetails.slot_start).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">End:</span>{" "}
              {new Date(appointmentDetails.slot_end).toLocaleString()}
            </p>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Invitee Information</h2>
            <p className="mb-1">
              <span className="font-medium">Name:</span> {appointmentDetails.invitee.name}
            </p>
            <p className="mb-1">
              <span className="font-medium">Email:</span> {appointmentDetails.invitee.email}
            </p>
            <p className="mb-1">
              <span className="font-medium">Phone:</span> {appointmentDetails.invitee.phone}
            </p>
            {appointmentDetails.invitee.notes && (
              <p>
                <span className="font-medium">Notes:</span> {appointmentDetails.invitee.notes}
              </p>
            )}
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Status</h2>
            <p>{appointmentDetails.status}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/dashboard"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </Link>
            {appointmentDetails.cancellation_token && (
              <>
                <Link
                  to={`/cancel_appointment?token=${appointmentDetails.cancellation_token}`}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Cancel Appointment
                </Link>
                <Link
                  to={`/reschedule_appointment?token=${appointmentDetails.cancellation_token}`}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Reschedule Appointment
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-red-600">No appointment details to display.</p>
        </div>
      )}
    </>
  );
};

export default UV_AppointmentDetails;