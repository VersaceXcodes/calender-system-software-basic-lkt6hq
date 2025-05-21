import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { set_auth } from "@/store/main";

interface ProfileForm {
  name: string;
  email: string;
  username: string;
  default_timezone: string;
  contact_details: { phone?: string };
  errorMessage: string;
  successMessage: string;
  isLoading: boolean;
}

const UV_Profile: React.FC = () => {
  const dispatch = useDispatch();
  // Get auth state from Redux store
  const auth_state = useSelector((state: any) => state.auth_state);
  const token = auth_state.auth_token;

  // Local state for the profile form
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    email: "",
    username: "",
    default_timezone: "",
    contact_details: {},
    errorMessage: "",
    successMessage: "",
    isLoading: false,
  });

  // Load the authenticated user's profile via GET /users/profile
  const loadProfile = async () => {
    setProfileForm((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: "",
      successMessage: "",
    }));
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/profile`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load profile");
      }
      const data = await response.json();
      setProfileForm({
        name: data.name,
        email: data.email,
        username: data.username,
        default_timezone: data.default_timezone,
        contact_details: data.contact_details || {},
        errorMessage: "",
        successMessage: "",
        isLoading: false,
      });
    } catch (error: any) {
      setProfileForm((prev) => ({
        ...prev,
        errorMessage: error.message || "Error loading profile",
        isLoading: false,
      }));
    }
  };

  // Save profile updates via PUT /users/profile
  const saveProfileUpdates = async () => {
    setProfileForm((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: "",
      successMessage: "",
    }));
    try {
      const payload = {
        email: profileForm.email,
        name: profileForm.name,
        default_timezone: profileForm.default_timezone,
        contact_details: profileForm.contact_details,
      };
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      const updatedData = await response.json();
      setProfileForm({
        name: updatedData.name,
        email: updatedData.email,
        username: updatedData.username,
        default_timezone: updatedData.default_timezone,
        contact_details: updatedData.contact_details || {},
        errorMessage: "",
        successMessage: "Profile updated successfully.",
        isLoading: false,
      });
      // Update global auth state with the new profile information while preserving token and auth status
      dispatch(
        set_auth({
          is_authenticated: auth_state.is_authenticated,
          auth_token: auth_state.auth_token,
          user: updatedData,
        })
      );
    } catch (error: any) {
      setProfileForm((prev) => ({
        ...prev,
        errorMessage: error.message || "Error updating profile",
        isLoading: false,
      }));
    }
  };

  // Handle changes in input fields; if the field is "phone", update contact_details.phone.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setProfileForm((prev) => ({
        ...prev,
        contact_details: { ...prev.contact_details, phone: value },
      }));
    } else {
      setProfileForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded p-6">
        <h1 className="text-2xl font-bold mb-4">Profile Management</h1>

        {profileForm.isLoading && (
          <p className="text-gray-600 mb-4">Loading profile...</p>
        )}

        {profileForm.errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {profileForm.errorMessage}
          </div>
        )}

        {profileForm.successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {profileForm.successMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveProfileUpdates();
          }}
        >
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-gray-700 font-bold mb-2"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={profileForm.name}
              onChange={handleChange}
              className="w-full border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
              disabled={profileForm.isLoading}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-gray-700 font-bold mb-2"
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={profileForm.email}
              onChange={handleChange}
              className="w-full border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
              disabled={profileForm.isLoading}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="username"
              className="block text-gray-700 font-bold mb-2"
            >
              Username:
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={profileForm.username}
              onChange={handleChange}
              className="w-full border rounded py-2 px-3 text-gray-700 bg-gray-100 cursor-not-allowed"
              disabled
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="default_timezone"
              className="block text-gray-700 font-bold mb-2"
            >
              Default Timezone:
            </label>
            <input
              type="text"
              id="default_timezone"
              name="default_timezone"
              value={profileForm.default_timezone}
              onChange={handleChange}
              placeholder="e.g., America/New_York"
              className="w-full border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
              disabled={profileForm.isLoading}
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="phone"
              className="block text-gray-700 font-bold mb-2"
            >
              Contact Phone:
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={profileForm.contact_details.phone || ""}
              onChange={handleChange}
              className="w-full border rounded py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
              disabled={profileForm.isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={profileForm.isLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Save Changes
          </button>
        </form>

        <div className="mt-6">
          <p className="text-gray-600 mb-2">
            Manage your scheduling settings:
          </p>
          <div className="flex space-x-4">
            <Link
              to="/availability_setup"
              className="text-blue-500 hover:underline"
            >
              Set Up Availability
            </Link>
            <Link
              to="/meeting_type_config"
              className="text-blue-500 hover:underline"
            >
              Configure Meeting Types
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Profile;