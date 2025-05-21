import React, { useState, useEffect, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { io, Socket } from "socket.io-client";

interface Invitee {
  name: string;
  email: string;
}

interface AppointmentData {
  appointment_id: string;
  slot_start: string;
  slot_end: string;
  meeting_type: string;
  invitee: Invitee;
  organizer_username?: string;
  organizer_id?: string;
}

interface SlotType {
  start_time: string;
  end_time: string;
  available: boolean;
}

const UV_RescheduleAppointment: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const tokenFromUrl = queryParams.get("token") || "";

  const [rescheduleToken, setRescheduleToken] = useState<string>(tokenFromUrl);
  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    appointment_id: "",
    slot_start: "",
    slot_end: "",
    meeting_type: "",
    invitee: { name: "", email: "" }
  });
  const [newSlot, setNewSlot] = useState<{ slot_start: string; slot_end: string }>({
    slot_start: "",
    slot_end: ""
  });
  const [rescheduleFormData, setRescheduleFormData] = useState<{ invitee_notes: string }>({
    invitee_notes: ""
  });
  const [availableSlots, setAvailableSlots] = useState<SlotType[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Define base URL from environment variable for consistency
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    if (!rescheduleToken) {
      setErrorMessage("Reschedule token is missing in URL");
      return;
    }
    setIsLoading(true);
    // Initialize Socket.IO connection for slot locking
    const newSocket: Socket = io(baseUrl);
    setSocket(newSocket);
    newSocket.on("lock_failed", (data: any) => {
      setErrorMessage(data.message || "Slot locking failed");
    });
    // Fetch appointment details and available slots
    fetchAppointmentDetailsForReschedule();
    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAppointmentDetailsForReschedule() {
    try {
      // Call the backend API to retrieve appointment details for rescheduling using the reschedule token
      const response = await fetch(`${baseUrl}/appointments/reschedule?token=${rescheduleToken}`);
      if (!response.ok) {
        throw new Error("Failed to fetch appointment details");
      }
      const data = await response.json();
      // Map the response to match the expected schema (using data.id as appointment_id if available)
      const mappedData: AppointmentData = {
        appointment_id: data.id || data.appointment_id,
        slot_start: data.slot_start,
        slot_end: data.slot_end,
        meeting_type: data.meeting_type,
        invitee: data.invitee,
        organizer_username: data.organizer_username,
        organizer_id: data.organizer_id
      };
      setAppointmentData(mappedData);
      // Fetch available slots using the organizer's username retrieved in the appointment details.
      const organizer = mappedData.organizer_username || "default";
      const slotsResponse = await fetch(`${baseUrl}/slots?organizer=${organizer}`);
      if (!slotsResponse.ok) {
        throw new Error("Failed to fetch available slots");
      }
      const slotsData = await slotsResponse.json();
      setAvailableSlots(slotsData);
      setIsLoading(false);
    } catch (error: any) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  function lockSlot(slot: SlotType) {
    if (socket && appointmentData.appointment_id) {
      // Use organizer_id from appointmentData; if not provided, default to "default_id"
      const organizer_id = appointmentData.organizer_id || "default_id";
      socket.emit("lock_slot", {
        organizer_id: organizer_id,
        slot_start: slot.start_time,
        slot_end: slot.end_time
      });
      // Set the new slot state immediately upon user's selection
      setNewSlot({ slot_start: slot.start_time, slot_end: slot.end_time });
      setErrorMessage(""); // Clear any previous errors
    } else {
      setErrorMessage("Unable to lock slot – socket connection not available");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!newSlot.slot_start || !newSlot.slot_end) {
      setErrorMessage("Please select a new time slot");
      return;
    }
    try {
      // Build the payload with the new slot and any additional form data
      const payload = {
        slot_start: newSlot.slot_start,
        slot_end: newSlot.slot_end,
        invitee_notes: rescheduleFormData.invitee_notes,
        reschedule_token: rescheduleToken
      };
      // Send a PUT request to update (reschedule) the appointment. The endpoint is protected; however, we assume
      // the secure token in the payload authorizes the rescheduling.
      const response = await fetch(`${baseUrl}/appointments/${appointmentData.appointment_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Failed to reschedule appointment");
      }
      const updatedAppointment = await response.json();
      const mappedUpdated: AppointmentData = {
        appointment_id: updatedAppointment.id || updatedAppointment.appointment_id,
        slot_start: updatedAppointment.slot_start,
        slot_end: updatedAppointment.slot_end,
        meeting_type: updatedAppointment.meeting_type,
        invitee: updatedAppointment.invitee,
        organizer_username: updatedAppointment.organizer_username,
        organizer_id: updatedAppointment.organizer_id
      };
      setAppointmentData(mappedUpdated);
      setConfirmationMessage("Your appointment has been successfully rescheduled.");
      setErrorMessage("");
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  }

  return (
    <>
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {errorMessage}
        </div>
      )}
      {isLoading ? (
        <div className="text-center text-lg">Loading appointment details...</div>
      ) : (
        <>
          {confirmationMessage ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-4">
              {confirmationMessage}
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4">Reschedule Appointment</h1>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Current Appointment Details</h2>
                <p>
                  <strong>Appointment ID:</strong> {appointmentData.appointment_id}
                </p>
                <p>
                  <strong>Meeting Type:</strong> {appointmentData.meeting_type}
                </p>
                <p>
                  <strong>Current Time:</strong>{" "}
                  {appointmentData.slot_start &&
                    new Date(appointmentData.slot_start).toLocaleString()}{" "}
                  to{" "}
                  {appointmentData.slot_end &&
                    new Date(appointmentData.slot_end).toLocaleString()}
                </p>
                <p>
                  <strong>Invitee:</strong> {appointmentData.invitee.name} (
                  {appointmentData.invitee.email})
                </p>
              </div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Select a New Time Slot</h2>
                {availableSlots.length === 0 ? (
                  <p>No available slots found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.start_time}
                        className={`border rounded p-2 ${
                          newSlot.slot_start === slot.start_time ? "bg-blue-200" : "bg-white"
                        } ${!slot.available ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => {
                          if (slot.available) lockSlot(slot);
                        }}
                      >
                        <p>
                          {new Date(slot.start_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}{" "}
                          -{" "}
                          {new Date(slot.end_time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <form onSubmit={handleSubmit} className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Additional Information</h2>
                <textarea
                  className="w-full border rounded p-2 mb-4"
                  placeholder="Enter any additional notes for rescheduling (optional)"
                  value={rescheduleFormData.invitee_notes}
                  onChange={(e) =>
                    setRescheduleFormData({ invitee_notes: e.target.value })
                  }
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Confirm Reschedule
                </button>
              </form>
              <div>
                <Link to="/" className="text-blue-500 hover:underline">
                  Return to Home
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
};

export default UV_RescheduleAppointment;