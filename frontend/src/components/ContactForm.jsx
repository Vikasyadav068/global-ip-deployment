import React, { useState } from "react";
import { Mail, Phone, User, MessageSquare, Send, CheckCircle2, X, AlertTriangle } from "lucide-react";

const ContactForm = ({ onClose }) => {
  const [mode, setMode] = useState("contact"); // "contact" or "report"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [reportData, setReportData] = useState({
    reporterName: "",
    reporterEmail: "",
    reportedUserName: "",
    reportedUserEmail: "",
    subject: "",
    reason: "",
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReportChange = (e) => {
    setReportData({ ...reportData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      if (mode === "contact") {
        // Call backend API for contact form
        const response = await fetch("http://localhost:8080/api/contact/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (data.success) {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
            if (onClose) onClose();
          }, 2000);
        } else {
          alert(data.message || "Failed to send message. Please try again.");
        }
      } else {
        // Call backend API for report user (without storing data)
        console.log("Sending report data:", reportData);
        const response = await fetch("http://localhost:8080/api/contact/report-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(reportData),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        if (data.success) {
          setSuccess(true);
          setTimeout(() => {
            setSuccess(false);
            setReportData({ 
              reporterName: "", 
              reporterEmail: "", 
              reportedUserName: "", 
              reportedUserEmail: "", 
              subject: "", 
              reason: "" 
            });
            if (onClose) onClose();
          }, 2000);
        } else {
          alert(data.message || "Failed to submit report. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error sending form:", error);
      console.error("Error details:", error.message);
      alert(`Failed to send: ${error.message}. Please ensure the backend server is running on port 8080 or email directly to vikaskumaryadav068@gmail.com`);
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                {mode === "contact" ? "Message Sent!" : "Report Submitted!"}
              </h3>
              <p className="text-gray-600">
                {mode === "contact" ? "We'll get back to you soon." : "Thank you for your report. We'll investigate this matter."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {mode === "contact" ? "Contact Us" : "Report User"}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {mode === "contact" 
                ? "Have a question? We'd love to hear from you." 
                : "Report a user for inappropriate behavior or policy violations."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Toggle Switch */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-center gap-4 p-2 bg-gray-100 rounded-xl">
            <button
              onClick={() => setMode("contact")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                mode === "contact"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <Mail size={18} className="inline mr-2" />
              Contact Us
            </button>
            <button
              onClick={() => setMode("report")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                mode === "report"
                  ? "bg-white text-red-600 shadow-md"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <AlertTriangle size={18} className="inline mr-2" />
              Report User
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">{mode === "contact" ? (
          <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <User size={16} className="inline mr-1" />
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Mail size={16} className="inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="john@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Phone size={16} className="inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare size={16} className="inline mr-1" />
              Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="How can we help?"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Message *
          </label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows="6"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            placeholder="Tell us more about your inquiry..."
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
            sending
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg hover:scale-105"
          }`}
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              Sending...
            </>
          ) : (
            <>
              <Send size={20} />
              Send Message
            </>
          )}
        </button>
          </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Reporter Information */}
              <div className="bg-blue-50 p-4 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User size={16} className="inline mr-1" />
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="reporterName"
                      value={reportData.reporterName}
                      onChange={handleReportChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Mail size={16} className="inline mr-1" />
                      Your Email *
                    </label>
                    <input
                      type="email"
                      name="reporterEmail"
                      value={reportData.reporterEmail}
                      onChange={handleReportChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Reported User Information */}
              <div className="bg-red-50 p-4 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">User Being Reported</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User size={16} className="inline mr-1" />
                      User Name *
                    </label>
                    <input
                      type="text"
                      name="reportedUserName"
                      value={reportData.reportedUserName}
                      onChange={handleReportChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                      placeholder="Reported user's name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Mail size={16} className="inline mr-1" />
                      User Email *
                    </label>
                    <input
                      type="email"
                      name="reportedUserEmail"
                      value={reportData.reportedUserEmail}
                      onChange={handleReportChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                      placeholder="user@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Report Details */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <MessageSquare size={16} className="inline mr-1" />
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={reportData.subject}
                  onChange={handleReportChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for Reporting *
                </label>
                <textarea
                  name="reason"
                  value={reportData.reason}
                  onChange={handleReportChange}
                  required
                  rows="6"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  placeholder="Please provide detailed information about why you are reporting this user..."
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
                  sending
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-red-500 to-orange-600 hover:shadow-lg hover:scale-105"
                }`}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} />
                    Report User
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Or email us directly at{" "}
              <a
                href="mailto:vikaskumaryadav068@gmail.com"
                className="text-blue-600 font-semibold hover:underline"
              >
                vikaskumaryadav068@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
