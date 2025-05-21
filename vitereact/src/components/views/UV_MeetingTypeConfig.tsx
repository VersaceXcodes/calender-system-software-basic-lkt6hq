import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { set_meeting_types } from "@/store/main"; // if you wish to update global data_cache_state.meetingTypes via dispatch

// Define TypeScript interfaces for meeting type and the form state.
interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration: number;
  is_default: boolean;
}

interface MeetingTypeForm {
  name: string;
  description: string;
  duration: number;
  is_default: boolean;
}

const UV_MeetingTypeConfig: React.FC = () => {
  // Get auth state from Redux store.
  const auth = useSelector((state: any) => state.auth_state);
  const dispatch = useDispatch();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Local state for the list of meeting types, form data, editing id, and error message.
  const [meetingTypes, setMeetingTypesState] = useState<MeetingType[]>([]);
  const [meetingTypeForm, setMeetingTypeForm] = useState<MeetingTypeForm>({
    name: "",
    description: "",
    duration: 15,
    is_default: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Function to fetch all meeting types.
  const fetchMeetingTypes = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/meeting-types`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.auth_token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch meeting types");
      }
      const data: MeetingType[] = await response.json();
      setMeetingTypesState(data);
      // Optionally update the global store
      dispatch(set_meeting_types(data));
    } catch (error: any) {
      setErrorMessage(error.message || "Error fetching meeting types");
    }
  }, [API_BASE_URL, auth.auth_token, dispatch]);

  // useEffect to load meeting types when component mounts.
  useEffect(() => {
    fetchMeetingTypes();
  }, [fetchMeetingTypes]);

  // Handle changes in the meeting type form fields.
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setMeetingTypeForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (name === "duration" ? Number(value) : value),
    }));
  };

  // Handle form submission for both create and edit.
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const url = editingId
        ? `${API_BASE_URL}/meeting-types/${editingId}`
        : `${API_BASE_URL}/meeting-types`;
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.auth_token}`,
        },
        body: JSON.stringify(meetingTypeForm),
      });
      if (!response.ok) {
        throw new Error(editingId ? "Failed to update meeting type" : "Failed to create meeting type");
      }
      // Clear the form and editing id.
      setMeetingTypeForm({ name: "", description: "", duration: 15, is_default: false });
      setEditingId(null);
      // Refresh the meeting types list.
      fetchMeetingTypes();
    } catch (error: any) {
      setErrorMessage(error.message || "Error in saving meeting type");
    }
  };

  // When user clicks on edit, prefill the form with selected meeting type's data.
  const handleEdit = (mt: MeetingType) => {
    setMeetingTypeForm({
      name: mt.name,
      description: mt.description,
      duration: mt.duration,
      is_default: mt.is_default,
    });
    setEditingId(mt.id);
  };

  // Cancel editing and reset form.
  const handleCancelEdit = () => {
    setMeetingTypeForm({ name: "", description: "", duration: 15, is_default: false });
    setEditingId(null);
    setErrorMessage("");
  };

  // Function to delete a meeting type.
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this meeting type?")) return;
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/meeting-types/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.auth_token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to delete meeting type");
      }
      // Refresh the meeting types list.
      fetchMeetingTypes();
    } catch (error: any) {
      setErrorMessage(error.message || "Error deleting meeting type");
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Meeting Type Configuration</h1>
      <form onSubmit={handleFormSubmit} className="mb-6 border p-4 rounded shadow">
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2 font-medium">
            Meeting Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={meetingTypeForm.name}
            onChange={handleInputChange}
            className="border rounded w-full px-3 py-2"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block mb-2 font-medium">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={meetingTypeForm.description}
            onChange={handleInputChange}
            className="border rounded w-full px-3 py-2"
            required
          ></textarea>
        </div>
        <div className="mb-4">
          <label htmlFor="duration" className="block mb-2 font-medium">
            Default Duration (minutes)
          </label>
          <select
            id="duration"
            name="duration"
            value={meetingTypeForm.duration}
            onChange={handleInputChange}
            className="border rounded w-full px-3 py-2"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </select>
        </div>
        <div className="mb-4 flex items-center">
          <input
            type="checkbox"
            id="is_default"
            name="is_default"
            checked={meetingTypeForm.is_default}
            onChange={handleInputChange}
            className="mr-2"
          />
          <label htmlFor="is_default">Default Meeting Type</label>
        </div>
        <div className="flex space-x-4">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            {editingId ? "Update Meeting Type" : "Create Meeting Type"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      {errorMessage && <div className="text-red-500 mb-4" role="alert">{errorMessage}</div>}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Existing Meeting Types</h2>
        {meetingTypes.length === 0 ? (
          <p>No meeting types configured.</p>
        ) : (
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="py-2 px-4 border">Name</th>
                <th className="py-2 px-4 border">Description</th>
                <th className="py-2 px-4 border">Duration</th>
                <th className="py-2 px-4 border">Default</th>
                <th className="py-2 px-4 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetingTypes.map((mt) => (
                <tr key={mt.id}>
                  <td className="py-2 px-4 border">{mt.name}</td>
                  <td className="py-2 px-4 border">{mt.description}</td>
                  <td className="py-2 px-4 border">{mt.duration} mins</td>
                  <td className="py-2 px-4 border">{mt.is_default ? "Yes" : "No"}</td>
                  <td className="py-2 px-4 border">
                    <button
                      type="button"
                      onClick={() => handleEdit(mt)}
                      className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mt.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded"
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
      <div>
        <Link to="/dashboard" className="text-blue-500 underline">
          Go to Dashboard
        </Link>
      </div>
    </>
  );
};

export default UV_MeetingTypeConfig;