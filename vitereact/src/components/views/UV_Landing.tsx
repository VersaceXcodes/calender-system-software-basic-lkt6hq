import React from "react";
import { Link } from "react-router-dom";

type CTAButton = {
  label: string;
  action: string;
};

type HeroBanner = {
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaButtons: CTAButton[];
};

const defaultHeroBanner: HeroBanner = {
  title: "Welcome to SimpleCal",
  subtitle: "Effortless scheduling for professionals",
  imageUrl: "https://picsum.photos/1200/400",
  ctaButtons: [
    { label: "Login", action: "navigateToLogin" },
    { label: "Register", action: "navigateToRegister" }
  ]
};

const UV_Landing: React.FC = () => {
  const heroBanner = defaultHeroBanner;

  return (
    <>
      {/* Hero Banner Section */}
      <header className="relative">
        <img
          src={heroBanner.imageUrl}
          alt="Hero banner background"
          className="w-full h-80 object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
          <h1 className="text-4xl font-bold mb-4">{heroBanner.title}</h1>
          <p className="text-xl mb-6">{heroBanner.subtitle}</p>
          <div className="flex space-x-4">
            {heroBanner.ctaButtons.map((btn) => {
              if (btn.action === 'navigateToLogin') {
                return (
                  <Link
                    key={btn.label}
                    to="/login"
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
                  >
                    {btn.label}
                  </Link>
                );
              }
              if (btn.action === 'navigateToRegister') {
                return (
                  <Link
                    key={btn.label}
                    to="/register"
                    className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                  >
                    {btn.label}
                  </Link>
                );
              }
              return null;
            })}
          </div>
        </div>
      </header>

      {/* Features Overview Section */}
      <main className="container mx-auto px-4 py-8">
        <section className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Real-time Booking</h2>
            <p className="text-gray-700">
              Book appointments instantly with real-time slot locking and updates.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">Intuitive Design</h2>
            <p className="text-gray-700">
              Enjoy a modern, responsive design that works seamlessly across all devices.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Easy Appointment Management
            </h2>
            <p className="text-gray-700">
              Manage your bookings effortlessly with a centralized dashboard.
            </p>
          </div>
        </section>
      </main>
    </>
  );
};

export default UV_Landing;