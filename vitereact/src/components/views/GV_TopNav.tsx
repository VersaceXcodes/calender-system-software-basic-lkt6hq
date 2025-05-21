import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { clear_auth } from "@/store/main";

interface AuthState {
  is_authenticated: boolean;
  auth_token: string;
  user: object;
}

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

interface RootState {
  auth_state: AuthState;
  notification_state: Notification[];
}

const GV_TopNav: React.FC = () => {
  // Local state for mobile menu and notification dropdown
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // Get global authentication and notifications state from Redux store
  const auth_state = useSelector((state: RootState) => state.auth_state);
  const notifications = useSelector((state: RootState) => state.notification_state);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  // Toggle notification dropdown
  const toggleNotificationDropdown = () => {
    setDropdownOpen(prev => !prev);
  };

  // Handle logout: call backend API and clear auth state, then redirect to landing page.
  const handleLogout = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth_state.auth_token}`
        }
      });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      dispatch(clear_auth());
      navigate("/");
    }
  };

  return (
    <>
      <nav className="bg-white shadow fixed top-0 w-full z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/">
                  <img
                    className="h-8 w-auto"
                    src="https://picsum.photos/seed/logo/50/50"
                    alt="Logo"
                  />
                </Link>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {auth_state.is_authenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/availability_setup"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Availability Setup
                    </Link>
                    <Link
                      to="/meeting_type_config"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Meeting Type Config
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium text-gray-900 hover:border-indigo-500"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {auth_state.is_authenticated && (
                <>
                  <div className="ml-3 relative">
                    <button
                      type="button"
                      onClick={toggleNotificationDropdown}
                      className="p-1 rounded-full text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      aria-label="Notifications"
                      aria-expanded={dropdownOpen}
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a2 2 0 10-4 0v1.083A6 6 0 004 11v3.159c0 .538-.214 1.055-.595 1.436L2 17h5m3 0v1a3 3 0 006 0v-1m-6 0h6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                      {notifications.length > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {notifications.length}
                        </span>
                      )}
                    </button>
                    {dropdownOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1">
                          {notifications.length > 0 ? (
                            notifications.map((noti) => (
                              <div key={noti.id} className="px-4 py-2 text-sm text-gray-700 border-b last:border-none">
                                {noti.message}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-sm text-gray-700">No notifications</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-4 px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {auth_state.is_authenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-indigo-700 bg-indigo-50"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/availability_setup"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Availability Setup
                  </Link>
                  <Link
                    to="/meeting_type_config"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Meeting Type Config
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-indigo-700 bg-indigo-50"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default GV_TopNav;