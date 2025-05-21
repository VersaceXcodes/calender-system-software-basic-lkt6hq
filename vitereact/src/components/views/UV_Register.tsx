import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { set_auth } from "@/store/main";

interface RegistrationFormState {
  name: string;
  email: string;
  password: string;
  errorMessage: string;
  isLoading: boolean;
}

const UV_Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Define the state for registration form
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>({
    name: "",
    email: "",
    password: "",
    errorMessage: "",
    isLoading: false,
  });

  // Handle input change for all fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({
      ...prev,
      [name]: value,
      errorMessage: ""
    }));
  };

  // Submit registration form function
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setRegistrationForm(prev => ({ ...prev, isLoading: true, errorMessage: "" }));

    // Basic validations
    try {
      if (!registrationForm.name.trim()) {
        throw new Error("Name is required.");
      }
      if (!/\S+@\S+\.\S+/.test(registrationForm.email)) {
        throw new Error("Invalid email address.");
      }
      if (registrationForm.password.length < 6) {
        throw new Error("Password must be at least 6 characters long.");
      }
      
      const backendURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      // Compute username from email and set default timezone to "UTC"
      const username = registrationForm.email.split("@")[0];
      const signupPayload = {
        email: registrationForm.email,
        password: registrationForm.password,
        username: username,
        name: registrationForm.name,
        default_timezone: "UTC",
        contact_details: {}
      };
      
      // Call signup endpoint
      await axios.post(`${backendURL}/auth/signup`, signupPayload);

      // On successful signup, login the user automatically
      const loginPayload = {
        email: registrationForm.email,
        password: registrationForm.password,
      };
      const loginResponse = await axios.post(`${backendURL}/auth/login`, loginPayload);
      
      // Get auth token and user from login response
      const { auth_token, user } = loginResponse.data;
      
      // Update global auth_state in Redux store
      dispatch(set_auth({
        is_authenticated: true,
        auth_token: auth_token,
        user: user
      }));
      
      // Redirect user to profile setup (UV_Profile)
      navigate("/profile");
    } catch (error: unknown) {
      let errorMsg = "Registration failed. Please try again.";
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      setRegistrationForm(prev => ({ ...prev, errorMessage: errorMsg }));
    } finally {
      setRegistrationForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-6">
        <div className="max-w-md w-full bg-white shadow-md rounded p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Register</h2>
          {registrationForm.errorMessage && (
            <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded bg-red-100 text-red-700">
              {registrationForm.errorMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-gray-700">Name</label>
              <input 
                type="text"
                id="name"
                name="name"
                value={registrationForm.name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-gray-700">Email</label>
              <input 
                type="email"
                id="email"
                name="email"
                value={registrationForm.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-gray-700">Password</label>
              <input 
                type="password"
                id="password"
                name="password"
                value={registrationForm.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-300"
                required
              />
              <p className="text-sm text-gray-500 mt-1">At least 6 characters.</p>
            </div>
            <div>
              <button 
                type="submit"
                className={`w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 ${registrationForm.isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={registrationForm.isLoading}
              >
                {registrationForm.isLoading ? "Registering..." : "Register"}
              </button>
            </div>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-600">Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Register;