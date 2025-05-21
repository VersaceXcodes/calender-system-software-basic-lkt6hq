import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

type Slot = {
  start_time: string;
  end_time: string;
  available: boolean;
};

const UV_PublicScheduling: React.FC = () => {
  // Get the organizer's username from URL params
  const { username } = useParams<{ username: string }>();

  // Guard against missing username
  if (!username) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <p className="text-center text-red-500">Organizer username is missing.</p>
      </div>
    );
  }

  // State variables as per the datamap specification
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Get API base URL from env variables
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Trigger fetch on component mount or when username changes
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/slots?organizer=${username}`);
        if (response.ok) {
          const data: Slot[] = await response.json();
          setAvailableSlots(data);
        } else {
          console.error("Failed to fetch slots, status:", response.status);
        }
      } catch (error) {
        console.error("Error fetching slots:", error);
      }
    };
    fetchSlots();
  }, [username, API_BASE_URL]);

  // Handler when a slot is selected (if needed for any further UI indication)
  const handleSelectSlot = (slot: Slot) => {
    setSelectedSlot(slot);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Public Scheduling Page for {username}
        </h1>
        {availableSlots.length === 0 ? (
          <p className="text-center text-gray-600">
            No available slots at this time. Please check back later.
          </p>
        ) : (
          <div className="space-y-4">
            {availableSlots.map((slot) => (
              <div
                key={`${slot.start_time}-${slot.end_time}`}
                className="flex items-center justify-between p-4 border rounded hover:shadow-lg"
              >
                <div>
                  <p className="text-lg font-medium">
                    Slot: {new Date(slot.start_time).toLocaleString()} -{" "}
                    {new Date(slot.end_time).toLocaleString()}
                  </p>
                  {!slot.available && (
                    <p className="text-sm text-red-500">Not available</p>
                  )}
                </div>
                {slot.available && (
                  <Link
                    to={`/${username}/book?slot_start=${encodeURIComponent(
                      slot.start_time
                    )}&slot_end=${encodeURIComponent(slot.end_time)}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => handleSelectSlot(slot)}
                  >
                    Book Now
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default UV_PublicScheduling;