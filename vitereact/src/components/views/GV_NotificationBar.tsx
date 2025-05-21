import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clear_notifications } from "@/store/main";
import { RootState } from "@/store";

const GV_NotificationBar: React.FC = () => {
  // Local state for dropdown visibility
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  // Get notifications from global Redux state
  const notifications = useSelector((state: RootState) => state.notification_state);

  // Local copy of notifications as per datamap
  const [notificationsList, setNotificationsList] = useState(notifications);

  useEffect(() => {
    setNotificationsList(notifications);
  }, [notifications]);

  // Toggle the dropdown open/closed
  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  // Clear notifications by dispatching the clear_notifications action.
  const clearAllNotifications = useCallback(() => {
    dispatch(clear_notifications());
  }, [dispatch]);

  return (
    <>
      <div className="relative inline-block">
        <button 
          onClick={toggleDropdown} 
          className="p-2 focus:outline-none hover:bg-gray-100 rounded-full"
          aria-label="Toggle notifications"
          aria-expanded={dropdownOpen}
        >
          {/* Bell Icon (using inline SVG) */}
          <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Optional badge: Show number of notifications if any */}
          {notificationsList && notificationsList.length > 0 && (
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full ring-2 ring-white bg-red-500"></span>
          )}
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
            <div className="p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">Notifications</span>
                <button 
                  onClick={clearAllNotifications} 
                  className="text-sm text-blue-600 hover:underline focus:outline-none"
                >
                  Clear
                </button>
              </div>
              {notificationsList.length === 0 ? (
                <p className="text-gray-500 text-sm">No notifications</p>
              ) : (
                <ul className="space-y-2">
                  {notificationsList.map((notification: { id: string; type: string; message: string; timestamp: string }) => (
                    <li key={notification.id} className="border-b pb-1">
                      <div className="text-sm font-medium text-gray-700">
                        {notification.type}
                      </div>
                      <p className="text-sm text-gray-500">
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GV_NotificationBar;