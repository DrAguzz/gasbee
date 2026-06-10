import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Privacy Policy</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Gasbee Privacy Policy</h2>
            <p className="text-gray-500">Last updated: June 2026</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">1. Introduction</h3>
            <p className="text-gray-700 leading-relaxed">
              Welcome to Gasbee. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our application 
              (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">2. Data We Collect</h3>
            <p className="text-gray-700 leading-relaxed">
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li><span className="font-medium">Identity Data:</span> includes first name, last name, username or similar identifier.</li>
              <li><span className="font-medium">Contact Data:</span> includes delivery address, email address and telephone numbers.</li>
              <li><span className="font-medium">Location Data:</span> includes real-time location data to facilitate the delivery of gas cylinders.</li>
              <li><span className="font-medium">Transaction Data:</span> includes details about payments to and from you and other details of products and services you have purchased from us.</li>
              <li><span className="font-medium">Device Data:</span> includes Advertising ID, device model, and operating system version for analytics and service improvements.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">3. How We Use Your Data</h3>
            <p className="text-gray-700 leading-relaxed">
              We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., delivering gas).</li>
              <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">4. Location and Advertising ID</h3>
            <p className="text-gray-700 leading-relaxed">
              <strong>Location Services:</strong> We require your location to match you with the nearest rider and to facilitate accurate deliveries. You can disable this at any time in your device settings, but it may affect app functionality.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Advertising ID:</strong> We use the Advertising ID provided by your device (Android 13+) strictly for internal analytics and service optimization to ensure you receive the best user experience. We do not sell your data to third-party ad networks.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">5. Data Security</h3>
            <p className="text-gray-700 leading-relaxed">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">6. Contact Us</h3>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this privacy policy or our privacy practices, please contact us at:
              <br />
              <strong>Email:</strong> support@gasbee.com.my
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
