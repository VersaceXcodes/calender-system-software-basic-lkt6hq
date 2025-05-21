import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const UV_PasswordReset: React.FC = () => {
  const [passwordResetForm, setPasswordResetForm] = useState<{
    email: string;
    errorMessage: string;
    successMessage: string;
    isLoading: boolean;
  }>({
    email: "",
    errorMessage: "",
    successMessage: "",
    isLoading: false,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!passwordResetForm.email || !emailRegex.test(passwordResetForm.email)) {
      setPasswordResetForm((prev) => ({ ...prev, errorMessage: "Please enter a valid email address." }));
      return;
    }

    // Set loading state and clear previous messages
    setPasswordResetForm((prev) => ({
      ...prev,
      isLoading: true,
      errorMessage: "",
      successMessage: "",
    }));

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/password-reset-request`,
        { email: passwordResetForm.email }
      );
      if (response && response.data) {
        setPasswordResetForm((prev) => ({
          ...prev,
          successMessage:
            response.data.message || "A password reset link has been sent to your email.",
          isLoading: false,
          email: "",
        }));
      }
    } catch (error: any) {
      const errorMsg = (error.response && error.response.data && (error.response.data.error || error.response.data.message)) || "Password reset request failed. Please try again later.";
      setPasswordResetForm((prev) => ({ ...prev, errorMessage: errorMsg, isLoading: false }));
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Reset Your Password</h1>
        <p className="text-gray-600 mb-4 text-center">
          Enter your email address below and we'll send you instructions to reset your password.
        </p>
        {passwordResetForm.errorMessage && (
          <div role="alert" aria-live="assertive" className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {passwordResetForm.errorMessage}
          </div>
        )}
        {passwordResetForm.successMessage && (
          <div role="alert" aria-live="assertive" className="mb-4 p-2 bg-green-100 text-green-700 rounded">
            {passwordResetForm.successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-500"
              value={passwordResetForm.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPasswordResetForm({
                  ...passwordResetForm,
                  email: e.target.value,
                  errorMessage: "",
                  successMessage: "",
                })
              }
              disabled={passwordResetForm.isLoading}
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition duration-200 ${
              passwordResetForm.isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={passwordResetForm.isLoading}
          >
            {passwordResetForm.isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-blue-500 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_PasswordReset;