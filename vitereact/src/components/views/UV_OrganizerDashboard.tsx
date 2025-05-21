import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

interface Invitee {
  name: string;
  email: string;
  phone: string;
}

interface Appointment {
  id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  invitee: Invitee;
  cancellation_token?: string;
}

const UV_OrganizerDashboard: React.FC = () => {
  // Local state for appointments, filter and loading indicator
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<string>("upcoming");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();

  // Access global auth_state and realtime_event_state from Redux store
  const auth_state = useSelector((state: any) => state.auth_state);
  const realtime_event = useSelector((state: any) => state.realtime_event_state);

  // Helper function to transform appointment data to expected nested structure
  const transformAppointment = (item: any): Appointment => {
    // If the item already has an invitee field, assume it's in the correct format
    if (item.invitee) return item;
    return {
      id: item.id,
      slot_start: item.slot_start,
      slot_end: item.slot_end,
      status: item.status,
      cancellation_token: item.cancellation_token,
      invitee: {
        name: item.invitee_name,
        email: item.invitee_email,
        phone: item.invitee_phone || ''
      }
    };
  };

  // Function to fetch appointments from backend based on current filter
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/appointments?filter=${filter}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth_state.auth_token}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      const data = await response.json();
      const transformedData = Array.isArray(data) ? data.map(transformAppointment) : [];
      setAppointments(transformedData);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  // useEffect to fetch appointments on component mount and when filter changes
  useEffect(() => {
    if (auth_state.is_authenticated) {
      fetchAppointments();
    }
  }, [filter, auth_state.is_authenticated]);

  // Listen for realtime appointment created events to add new appointment if not already present
  useEffect(() => {
    if (
      realtime_event.last_appointment_created &&
      realtime_event.last_appointment_created.organizer_id === auth_state.user.id
    ) {
      setAppointments((prevAppointments) => {
        const exists = prevAppointments.find(
          (app) => app.id === realtime_event.last_appointment_created.appointment_id
        );
        if (!exists) {
          const newAppointment = transformAppointment(realtime_event.last_appointment_created);
          return [...prevAppointments, newAppointment];
        }
        return prevAppointments;
      });
    }
  }, [realtime_event.last_appointment_created, auth_state.user.id]);

  // Listen for realtime appointment updated events to update appointment details in state
  useEffect(() => {
    if (realtime_event.last_appointment_updated) {
      setAppointments((prevAppointments) =>
        prevAppointments.map((app) =>
          app.id === realtime_event.last_appointment_updated.appointment_id
            ? { ...app, ...transformAppointment(realtime_event.last_appointment_updated.updated_fields) }
            : app
        )
      );
    }
  }, [realtime_event.last_appointment_updated]);

  // Cancel appointment function. Makes a PUT request to update status to "canceled"
  const cancelAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth_state.auth_token}`
        },
        body: JSON.stringify({ status: "canceled" })
      });
      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }
      const updatedAppointment = await response.json();
      const transformedAppointment = transformAppointment(updatedAppointment);
      setAppointments((prevAppointments) =>
        prevAppointments.map((app) =>
          app.id === appointmentId ? transformedAppointment : app
        )
      );
    } catch (error) {
      console.error("Error canceling appointment:", error);
    }
  };

  // Reschedule appointment function. Redirects to reschedule view with token parameter.
  const rescheduleAppointment = (appointment: Appointment) => {
    if (appointment.cancellation_token) {
      navigate(`/reschedule_appointment?token=${appointment.cancellation_token}`);
    } else {
      console.error("Reschedule token not available for appointment", appointment.id);
    }
  };

  // Navigate to appointment details page
  const viewAppointmentDetails = (appointmentId: string) => {
    navigate(`/appointment/${appointmentId}`);
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Organizer Dashboard</h1>
      <div className="mb-4">
        <label className="mr-2 font-medium" htmlFor="filter-select">Filter: </label>
        <select
          id="filter-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="upcoming">Upcoming</option>
          <option value="all">All</option>
        </select>
      </div>
      {loading ? (
        <p>Loading appointments...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((app) => (
            <div
              key={app.id}
              className="border p-4 rounded shadow flex flex-col md:flex-row md:justify-between"
            >
              <div>
                <p>
                  <span className="font-semibold">Time: </span>
                  {new Date(app.slot_start).toLocaleString()} -{" "}
                  {new Date(app.slot_end).toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">Status: </span>
                  {app.status}
                </p>
                <p>
                  <span className="font-semibold">Invitee: </span>
                  {app.invitee.name} ({app.invitee.email})
                  {app.invitee.phone && ` - ${app.invitee.phone}`}
                </p>
              </div>
              <div className="mt-2 md:mt-0 flex space-x-2">
                <button
                  onClick={() => viewAppointmentDetails(app.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  View Details
                </button>
                {app.status !== "canceled" && (
                  <>
                    <button
                      onClick={() => cancelAppointment(app.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rescheduleAppointment(app)}
                      className="bg-green-500 text-white px-3 py-1 rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      Reschedule
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default UV_OrganizerDashboard;