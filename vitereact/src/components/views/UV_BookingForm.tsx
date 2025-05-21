import React, { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useSelector } from "react-redux";

interface BookingFormData {
  invitee_name: string;
  invitee_email: string;
  invitee_phone: string;
  invitee_notes: string;
  selectedMeetingType: string;
}

interface SelectedSlot {
  slot_start: string;
  slot_end: string;
}

interface ValidationErrors {
  invitee_name: string;
  invitee_email: string;
  invitee_phone: string;
  invitee_notes: string;
}

interface MeetingType {
  id: string;
  name: string;
  duration: number;
}

const UV_BookingForm: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // Global auth state (for secure API requests)
  const auth_state = useSelector((state: any) => state.auth_state);

  // Extract URL query parameters for slot_start and slot_end
  const searchParams = new URLSearchParams(location.search);
  const slot_start_fromUrl = searchParams.get("slot_start") || "";
  const slot_end_fromUrl = searchParams.get("slot_end") || "";

  // Local states for form data, selected slot, validation errors, locking, and submission.
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    invitee_name: "",
    invitee_email: "",
    invitee_phone: "",
    invitee_notes: "",
    selectedMeetingType: ""
  });
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>({
    slot_start: slot_start_fromUrl,
    slot_end: slot_end_fromUrl
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    invitee_name: "",
    invitee_email: "",
    invitee_phone: "",
    invitee_notes: ""
  });
  const [isSlotLocked, setIsSlotLocked] = useState<boolean>(false);
  const [lockError, setLockError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // For demonstration, we set a default meeting type array.
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([
    { id: "mt_default", name: "Default Meeting", duration: 30 }
  ]);

  // If exactly one meeting type exists, pre-fill the selectedMeetingType.
  useEffect(() => {
    if (meetingTypes.length === 1) {
      setBookingFormData(prev => ({
        ...prev,
        selectedMeetingType: meetingTypes[0].id
      }));
    }
  }, [meetingTypes]);

  // Lock the selected slot upon page load.
  const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    // Create a new socket connection.
    const socket = io(import.meta.env.VITE_API_BASE_URL);
    socketRef.current = socket;
    // Emit "lock_slot" event with organizer_id (using username), slot_start, and slot_end.
    socket.emit("lock_slot", {
      organizer_id: username,
      slot_start: selectedSlot.slot_start,
      slot_end: selectedSlot.slot_end
    });
    // Listen for "slot_locked" event to confirm the lock.
    socket.on("slot_locked", (data: { organizer_id: string; slot_start: string; slot_end: string; lock_expires_at: string }) => {
      if (
        data.slot_start === selectedSlot.slot_start &&
        data.slot_end === selectedSlot.slot_end &&
        data.organizer_id === username
      ) {
        setIsSlotLocked(true);
      }
      socket.disconnect();
    });
    // Listen for "lock_failed" event.
    socket.on("lock_failed", (data: { message: string }) => {
      setLockError(data.message || "Slot is currently locked by another client. Please try again later.");
      socket.disconnect();
    });
    // Cleanup on unmount.
    return () => {
      socket.disconnect();
    };
  }, [username, selectedSlot]);

  // Handle input changes.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error on change.
    setValidationErrors(prev => ({
      ...prev,
      [name]: ""
    }));
  };

  // Validate form fields.
  const validateForm = () => {
    let errors: ValidationErrors = {
      invitee_name: "",
      invitee_email: "",
      invitee_phone: "",
      invitee_notes: ""
    };
    let isValid = true;
    if (!bookingFormData.invitee_name.trim()) {
      errors.invitee_name = "Name is required.";
      isValid = false;
    }
    if (!bookingFormData.invitee_email.trim()) {
      errors.invitee_email = "Email is required.";
      isValid = false;
    }
    // Basic email format check.
    const emailRegex = /\S+@\S+\.\S+/;
    if (bookingFormData.invitee_email && !emailRegex.test(bookingFormData.invitee_email)) {
      errors.invitee_email = "Invalid email format.";
      isValid = false;
    }
    // If meetingTypes has more than one option, ensure a selection is made.
    if (meetingTypes.length > 1 && !bookingFormData.selectedMeetingType) {
      // This field error could be set if the user did not choose one.
      // (If only one meeting type exists, we have pre-filled it.)
      isValid = false;
    }
    setValidationErrors(errors);
    return isValid;
  };

  // Handle form submission.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Validate inputs.
    if (!validateForm()) {
      return;
    }
    // Prevent submission if the slot is not successfully locked.
    if (!isSlotLocked) {
      setLockError("Waiting for slot lock confirmation. Please wait.");
      return;
    }
    setIsSubmitting(true);

    // If no meeting type selected (should not happen if default exists), use default.
    const meeting_type_id = bookingFormData.selectedMeetingType || (meetingTypes.length === 1 ? meetingTypes[0].id : "");

    // Include slot_end in the payload to match backend requirements
    const payload = {
      meeting_type_id,
      slot_start: selectedSlot.slot_start,
      slot_end: selectedSlot.slot_end,
      invitee_name: bookingFormData.invitee_name,
      invitee_email: bookingFormData.invitee_email,
      invitee_phone: bookingFormData.invitee_phone,
      invitee_notes: bookingFormData.invitee_notes
    };
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth_state.auth_token ? { Authorization: `Bearer ${auth_state.auth_token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (response.status === 201) {
        // Appointment successfully created.
        navigate("/booking_confirmation");
      } else if (response.status === 409) {
        // Conflict: slot already booked.
        setLockError("This time slot is already booked. Please try another slot.");
      } else {
        // General error.
        setLockError("An error occurred while booking the appointment.");
      }
    } catch (error) {
      setLockError("Network error occurred while booking the appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-lg mx-auto bg-white shadow-md rounded p-6">
        <h2 className="text-2xl font-bold mb-4">Book an Appointment</h2>
        {/* Display selected slot details */}
        <div className="mb-4">
          <p className="text-gray-700">Selected Slot: <span className="font-medium">{selectedSlot.slot_start} {selectedSlot.slot_end && `to ${selectedSlot.slot_end}`}</span></p>
        </div>
        {/* Show slot lock spinner or error */}
        {!isSlotLocked && !lockError && (
          <div className="mb-4 flex items-center" role="status" aria-live="polite">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-blue-500">Locking slot...</span>
          </div>
        )}
        {lockError && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded" role="alert">
            {lockError}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="invitee_name" className="block text-gray-700 font-medium mb-1">Name*</label>
            <input
              type="text"
              id="invitee_name"
              name="invitee_name"
              value={bookingFormData.invitee_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Your full name"
            />
            {validationErrors.invitee_name && <p className="text-red-500 text-sm">{validationErrors.invitee_name}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="invitee_email" className="block text-gray-700 font-medium mb-1">Email*</label>
            <input
              type="email"
              id="invitee_email"
              name="invitee_email"
              value={bookingFormData.invitee_email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
            {validationErrors.invitee_email && <p className="text-red-500 text-sm">{validationErrors.invitee_email}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="invitee_phone" className="block text-gray-700 font-medium mb-1">Phone (Optional)</label>
            <input
              type="text"
              id="invitee_phone"
              name="invitee_phone"
              value={bookingFormData.invitee_phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Your phone number"
            />
            {validationErrors.invitee_phone && <p className="text-red-500 text-sm">{validationErrors.invitee_phone}</p>}
          </div>
          <div className="mb-4">
            <label htmlFor="invitee_notes" className="block text-gray-700 font-medium mb-1">Meeting Purpose / Notes (Optional)</label>
            <textarea
              id="invitee_notes"
              name="invitee_notes"
              value={bookingFormData.invitee_notes}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              placeholder="Brief description of your meeting purpose"
            ></textarea>
            {validationErrors.invitee_notes && <p className="text-red-500 text-sm">{validationErrors.invitee_notes}</p>}
          </div>
          {/* Conditionally render meeting type selector if there are multiple meeting types.
              If only one meeting type exists, display it as read-only. */}
          {meetingTypes.length > 1 ? (
            <div className="mb-4">
              <label htmlFor="selectedMeetingType" className="block text-gray-700 font-medium mb-1">Select Meeting Type*</label>
              <select
                id="selectedMeetingType"
                name="selectedMeetingType"
                value={bookingFormData.selectedMeetingType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Meeting Type --</option>
                {meetingTypes.map(mt => (
                  <option key={mt.id} value={mt.id}>{mt.name} ({mt.duration} mins)</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-1">Meeting Type</label>
              <input
                type="text"
                value={meetingTypes[0]?.name || ""}
                readOnly
                className="w-full bg-gray-100 border border-gray-300 rounded px-3 py-2"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={!isSlotLocked || isSubmitting}
            className={`w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 focus:outline-none ${(!isSlotLocked || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "Booking..." : "Submit Booking"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to={`/${username}`} className="text-blue-500 hover:underline">
            Back to Scheduling Page
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_BookingForm;