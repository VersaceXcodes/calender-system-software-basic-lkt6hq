import React, { useState, ChangeEvent, FormEvent } from "react";
import { useDispatch } from "react-redux";
import { set_auth } from "@/store/main";
import { useNavigate, Link } from "react-router-dom";

interface LoginForm {
  email: string;
  password: string;
  errorMessage: string;
  isLoading: boolean;
}

const UV_Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state for the login form as per the datamap
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
    errorMessage: "",
    isLoading: false,
  });
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Handle changes for email and password inputs
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle "Remember Me" checkbox change
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setRememberMe(e.target.checked);
  };

  const submitLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    // Clear any existing error message and set loading state
    setLoginForm(prev => ({ ...prev, errorMessage: "", isLoading: true }));
    
    // Basic validation for email and password fields
    if (!loginForm.email || !loginForm.password) {
      setLoginForm(prev => ({
        ...prev,
        errorMessage: "Email and password are required.",
        isLoading: false,
      }));
      return;
    }

    try {
      // Use VITE_API_BASE_URL from environment variables or fallback to localhost
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        // Show error message returned from backend if login fails
        setLoginForm(prev => ({
          ...prev,
          errorMessage: data.error || "Login failed",
          isLoading: false,
        }));
        return;
      }

      // On successful login, update the global auth_state with user data and JWT token.
      dispatch(
        set_auth({
          is_authenticated: true,
          auth_token: data.auth_token,
          user: data.user,
        })
      );

      // Optionally store the token locally if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem("auth_token", data.auth_token);
      } else {
        localStorage.removeItem("auth_token");
      }

      // Redirect the user to the Organizer Dashboard after successful login.
      navigate("/dashboard");
    } catch (error: any) {
      setLoginForm(prev => ({
        ...prev,
        errorMessage: error.message || "Login failed",
        isLoading: false,
      }));
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        {loginForm.errorMessage && (
          <div className="mb-4 text-red-500 text-sm" role="alert" aria-live="assertive">
            {loginForm.errorMessage}
          </div>
        )}
        <form onSubmit={submitLogin} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={loginForm.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={handleCheckboxChange}
              className="mr-2"
              aria-label="Remember Me"
            />
            <label htmlFor="rememberMe" className="text-gray-700">
              Remember Me
            </label>
          </div>
          <div className="mb-4">
            <button
              type="submit"
              disabled={loginForm.isLoading}
              className={`w-full px-3 py-2 bg-blue-500 text-white rounded ${
                loginForm.isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
              }`}
            >
              {loginForm.isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
          <div className="flex justify-between text-sm">
            <Link to="/password_reset" className="text-blue-500 hover:underline">
              Forgot Password?
            </Link>
            <Link to="/register" className="text-blue-500 hover:underline">
              Register
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default UV_Login;