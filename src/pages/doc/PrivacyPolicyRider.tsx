import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicyRider = () => {
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
          <h1 className="text-xl font-semibold text-gray-900">Privacy Policy (Rider)</h1>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Gasbee Rider Privacy Policy</h2>
            <p className="text-gray-500">Last updated: June 2026</p>
          </div>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">1. Introduction</h3>
            <p className="text-gray-700 leading-relaxed">
              Welcome to the Gasbee Rider App. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we handle your personal data when you use the Gasbee Rider application to receive and complete delivery jobs.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">2. Data We Collect</h3>
            <p className="text-gray-700 leading-relaxed">
              We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
            </p>
            <ul className="list-disc pl-5 text-gray-700 space-y-2">
              <li><span className="font-medium">Identity Data:</span> includes first name, last name, IC number, driver's license, and profile photo.</li>
              <li><span className="font-medium">Contact Data:</span> includes email address and telephone numbers.</li>
              <li><span className="font-medium">Background Location Data:</span> includes real-time location data tracked in the background to dispatch jobs to you accurately and allow customers to track their delivery.</li>
              <li><span className="font-medium">Vehicle Data:</span> details about the vehicle used for deliveries.</li>
              <li><span className="font-medium">Financial Data:</span> includes bank account details for earnings disbursement.</li>
              <li><span className="font-medium">Device Data:</span> includes Advertising ID, device model, and operating system version.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">3. Background Location Tracking</h3>
            <p className="text-gray-700 leading-relaxed">
              <strong>Why we need Background Location:</strong> The Gasbee Rider App collects location data to enable job dispatching, estimate arrival times, and allow customers to track deliveries on a map. This feature is active even when the app is closed or not in use, provided you are marked as "Active" or "Online" within the app.
            </p>
            <p className="text-gray-700 leading-relaxed">
              If you go "Offline", background location tracking is immediately suspended. You can control this permission at any time via your device settings.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">4. Advertising ID and Analytics</h3>
            <p className="text-gray-700 leading-relaxed">
              <strong>Advertising ID:</strong> We use the Advertising ID strictly for internal analytics, monitoring app stability, and service optimization. We do not sell your data to third-party ad networks.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">5. How We Use Your Data</h3>
            <p className="text-gray-700 leading-relaxed">
              We use your data to manage your rider account, assign nearby deliveries to you, process your earnings, and comply with any regulatory or legal obligations.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">6. Data Security</h3>
            <p className="text-gray-700 leading-relaxed">
              We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">7. Contact Us</h3>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this privacy policy, please contact us at:
              <br />
              <strong>Email:</strong> support@gasbee.com.my
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyRider;
