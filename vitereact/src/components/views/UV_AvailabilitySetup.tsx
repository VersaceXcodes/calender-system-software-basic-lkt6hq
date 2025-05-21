import React, { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

interface Availability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  buffer_before: number;
  buffer_after: number;
  meeting_duration: number;
}

const defaultAvailability: Availability = {
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  buffer_before: 10,
  buffer_after: 10,
  meeting_duration: 30
};

const UV_AvailabilitySetup: React.FC = () => {
  // Access global auth state
  const authState = useSelector((state: any) => state.auth_state);
  
  // Local state for availabilities and the current form
  const [availabilityList, setAvailabilityList] = useState<Availability[]>([]);
  const [availabilityForm, setAvailabilityForm] = useState<Availability>(defaultAvailability);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Get the base URL from environment variable or default to localhost
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Function to fetch recurring availability entries from backend on component mount
  const fetchAvailability = async () => {
    try {
      const response = await fetch(`${BASE_URL}/availability/recurring`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authState.auth_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailabilityList(data);
      } else {
        console.error("Failed to fetch availability entries.");
      }
    } catch (error) {
      console.error("Error while fetching availability:", error);
    }
  };

  useEffect(() => {
    if (authState.auth_token) {
      fetchAvailability();
    }
  }, [authState.auth_token]);

  // Handle change on form inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setAvailabilityForm(prev => ({
      ...prev,
      [name]:
        name === "day_of_week"
          ? parseInt(value, 10)
          : (["buffer_before", "buffer_after", "meeting_duration"].includes(name)
              ? Number(value)
              : value)
    }));
  };

  // Handle form submission to save or update availability
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    try {
      if (availabilityForm.id) {
        // Update existing availability
        const response = await fetch(`${BASE_URL}/availability/recurring/${availabilityForm.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authState.auth_token}`
          },
          body: JSON.stringify({
            day_of_week: availabilityForm.day_of_week,
            start_time: availabilityForm.start_time,
            end_time: availabilityForm.end_time,
            buffer_before: availabilityForm.buffer_before,
            buffer_after: availabilityForm.buffer_after,
            meeting_duration: availabilityForm.meeting_duration
          }),
        });
        if (response.ok) {
          const updatedEntry = await response.json();
          setAvailabilityList(prev => prev.map(item => item.id === updatedEntry.id ? updatedEntry : item));
          setAvailabilityForm(defaultAvailability);
          setIsEditing(false);
        } else {
          console.error("Failed to update availability entry.");
        }
      } else {
        // Create new availability entry
        const response = await fetch(`${BASE_URL}/availability/recurring`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authState.auth_token}`
          },
          body: JSON.stringify({
            day_of_week: availabilityForm.day_of_week,
            start_time: availabilityForm.start_time,
            end_time: availabilityForm.end_time,
            buffer_before: availabilityForm.buffer_before,
            buffer_after: availabilityForm.buffer_after,
            meeting_duration: availabilityForm.meeting_duration
          }),
        });
        if (response.ok) {
          const createdEntry = await response.json();
          setAvailabilityList(prev => [...prev, createdEntry]);
          setAvailabilityForm(defaultAvailability);
        } else {
          console.error("Failed to create availability entry.");
        }
      }
    } catch (error) {
      console.error("Error in saving availability:", error);
    }
  };

  // Handle deletion of an availability entry
  const handleDelete = async (id: string | undefined): Promise<void> => {
    if (!id) return;
    try {
      const response = await fetch(`${BASE_URL}/availability/recurring/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authState.auth_token}`
        }
      });
      if (response.status === 204) {
        setAvailabilityList(prev => prev.filter(item => item.id !== id));
      } else {
        console.error("Failed to delete availability entry.");
      }
    } catch (error) {
      console.error("Error deleting availability entry:", error);
    }
  };

  // Handle editing: load the selected availability into the form
  const handleEdit = (availability: Availability): void => {
    setAvailabilityForm(availability);
    setIsEditing(true);
  };

  // Cancel edit mode and reset the form
  const handleCancelEdit = (): void => {
    setAvailabilityForm(defaultAvailability);
    setIsEditing(false);
  };

  const getDayName = (day: number): string => {
    switch (day) {
      case 0:
        return "Sunday";
      case 1:
        return "Monday";
      case 2:
        return "Tuesday";
      case 3:
        return "Wednesday";
      case 4:
        return "Thursday";
      case 5:
        return "Friday";
      case 6:
        return "Saturday";
      default:
        return "N/A";
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Availability Setup</h1>
      <p className="mb-6">
        Set up your weekly recurring availability. Adjust the days, times, buffer periods, and meeting duration as needed.
      </p>
      <form className="mb-8" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="day_of_week" className="block mb-1 font-medium">Day of Week</label>
            <select
              id="day_of_week"
              name="day_of_week"
              value={availabilityForm.day_of_week}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
          </div>
          <div>
            <label htmlFor="start_time" className="block mb-1 font-medium">Start Time</label>
            <input
              id="start_time"
              type="time"
              name="start_time"
              value={availabilityForm.start_time}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block mb-1 font-medium">End Time</label>
            <input
              id="end_time"
              type="time"
              name="end_time"
              value={availabilityForm.end_time}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="buffer_before" className="block mb-1 font-medium">Buffer Before (min)</label>
            <input
              id="buffer_before"
              type="number"
              name="buffer_before"
              value={availabilityForm.buffer_before}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="buffer_after" className="block mb-1 font-medium">Buffer After (min)</label>
            <input
              id="buffer_after"
              type="number"
              name="buffer_after"
              value={availabilityForm.buffer_after}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label htmlFor="meeting_duration" className="block mb-1 font-medium">Meeting Duration (min)</label>
            <input
              id="meeting_duration"
              type="number"
              name="meeting_duration"
              value={availabilityForm.meeting_duration}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            {isEditing ? "Update Availability" : "Add Availability"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="ml-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Availability Entries</h2>
        {availabilityList.length === 0 ? (
          <p>No availability entries found.</p>
        ) : (
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Day</th>
                <th className="py-2 px-4 border-b">Start Time</th>
                <th className="py-2 px-4 border-b">End Time</th>
                <th className="py-2 px-4 border-b">Buffer Before</th>
                <th className="py-2 px-4 border-b">Buffer After</th>
                <th className="py-2 px-4 border-b">Duration</th>
                <th className="py-2 px-4 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {availabilityList.map(entry => (
                <tr key={entry.id} className="text-center">
                  <td className="py-2 px-4 border-b">{getDayName(entry.day_of_week)}</td>
                  <td className="py-2 px-4 border-b">{entry.start_time}</td>
                  <td className="py-2 px-4 border-b">{entry.end_time}</td>
                  <td className="py-2 px-4 border-b">{entry.buffer_before}</td>
                  <td className="py-2 px-4 border-b">{entry.buffer_after}</td>
                  <td className="py-2 px-4 border-b">{entry.meeting_duration}</td>
                  <td className="py-2 px-4 border-b">
                    <button
                      type="button"
                      onClick={() => handleEdit(entry)}
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-2 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-6">
        <Link to="/meeting_type_config" className="text-blue-500 hover:underline">
          Next: Configure Meeting Types
        </Link>
      </div>
    </>
  );
};

export default UV_AvailabilitySetup;