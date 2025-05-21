import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { add_notification } from "@/store/main";

const UV_CancelAppointment: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  const [cancellationToken, setCancellationToken] = useState<string>("");
  const [appointmentData, setAppointmentData] = useState<{
    appointment_id: string;
    slot_start: string;
    slot_end: string;
    meeting_type: string;
    invitee: { name: string; email: string };
  }>({
    appointment_id: "",
    slot_start: "",
    slot_end: "",
    meeting_type: "",
    invitee: { name: "", email: "" }
  });
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Function to fetch appointment details using the cancellation token
  const fetchAppointmentDetailsForCancellation = async (token: string) => {
    setFetchLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://localhost:3000/appointments/cancellation_details?token=${token}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch appointment details. Please verify the cancellation link.");
      }
      const data = await response.json();
      setAppointmentData(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while fetching appointment details.");
    } finally {
      setFetchLoading(false);
    }
  };

  // Function to cancel the appointment
  const cancelAppointment = async () => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this appointment?");
    if (!confirmCancel) return;
    setCancelLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://localhost:3000/appointments/cancellation?token=${cancellationToken}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status: "canceled" })
        }
      );
      if (!response.ok) {
        throw new Error("Failed to cancel the appointment. Please try again.");
      }
      await response.json();
      setSuccess("Appointment canceled successfully.");
      dispatch(
        add_notification({
          id: new Date().getTime().toString(),
          type: "appointment_canceled",
          message: "Appointment canceled successfully.",
          timestamp: new Date().toISOString()
        })
      );
    } catch (err: any) {
      setError(err.message || "An error occurred while canceling the appointment.");
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setCancellationToken(tokenParam);
      fetchAppointmentDetailsForCancellation(tokenParam);
    } else {
      setError("Cancellation token is missing in the URL.");
    }
  }, [location.search]);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Cancel Appointment</h1>
        {fetchLoading && (
          <p className="text-gray-600 mb-4">Loading appointment details...</p>
        )}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">
            {success}
          </div>
        )}
        {!fetchLoading && !error && appointmentData.appointment_id && !success && (
          <div className="bg-white shadow p-4 rounded mb-4">
            <h2 className="text-xl font-semibold mb-2">Appointment Details</h2>
            <p>
              <span className="font-medium">Meeting Type:</span> {appointmentData.meeting_type}
            </p>
            <p>
              <span className="font-medium">Slot Start:</span> {appointmentData.slot_start}
            </p>
            <p>
              <span className="font-medium">Slot End:</span> {appointmentData.slot_end}
            </p>
            <p>
              <span className="font-medium">Invitee Name:</span> {appointmentData.invitee.name}
            </p>
            <p>
              <span className="font-medium">Invitee Email:</span> {appointmentData.invitee.email}
            </p>
          </div>
        )}
        {!success && appointmentData.appointment_id && (
          <button
            type="button"
            className={`bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ${cancelLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={cancelAppointment}
            disabled={cancelLoading}
          >
            {cancelLoading ? "Cancelling..." : "Cancel Appointment"}
          </button>
        )}
        {success && (
          <div className="mt-4">
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              Return to Dashboard
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_CancelAppointment;