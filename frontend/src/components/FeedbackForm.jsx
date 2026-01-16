import React, { useState } from "react";
import { Star, Send, CheckCircle2, MessageSquare, X } from "lucide-react";

const FeedbackForm = ({ onClose, userProfile }) => {
  const [ratings, setRatings] = useState({
    userInterface: 0,
    performance: 0,
    features: 0,
    support: 0,
    overallExperience: 0,
  });
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const ratingCategories = [
    { key: "userInterface", label: "User Interface & Design" },
    { key: "performance", label: "Performance & Speed" },
    { key: "features", label: "Features & Functionality" },
    { key: "support", label: "Customer Support" },
    { key: "overallExperience", label: "Overall Experience" },
  ];

  const handleStarClick = (category, rating) => {
    setRatings({ ...ratings, [category]: rating });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if at least one rating is given
    const hasRating = Object.values(ratings).some(r => r > 0);
    if (!hasRating && !feedback.trim()) {
      alert("Please provide at least one rating or feedback comment.");
      return;
    }

    setSending(true);

    try {
      // Prepare feedback data for backend
      const feedbackData = {
        userName: userProfile?.firstName && userProfile?.lastName 
          ? `${userProfile.firstName} ${userProfile.lastName}` 
          : "Anonymous",
        userEmail: userProfile?.email || "",
        userId: userProfile?.uid || "",
        userInterfaceRating: ratings.userInterface,
        performanceRating: ratings.performance,
        featuresRating: ratings.features,
        supportRating: ratings.support,
        overallRating: ratings.overallExperience,
        feedbackMessage: feedback || "No additional feedback provided",
      };

      // Call backend API
      const response = await fetch("http://localhost:8080/api/feedback/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setRatings({
            userInterface: 0,
            performance: 0,
            features: 0,
            support: 0,
            overallExperience: 0,
          });
          setFeedback("");
          if (onClose) onClose();
        }, 2000);
      } else {
        alert(data.message || "Failed to send feedback. Please try again.");
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Failed to send feedback. Please try again later.");
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
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h3>
              <p className="text-gray-600">Your feedback helps us improve.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StarRating = ({ category, currentRating }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`${
                star <= currentRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              We Value Your Feedback
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Please rate your experience and help us serve you better.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Categories */}
        <div className="space-y-4">
          {ratingCategories.map((category) => (
            <div
              key={category.key}
              className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="text-sm font-semibold text-gray-700 flex-1">
                  {category.label}
                </label>
                <div className="flex items-center gap-3">
                  <StarRating
                    category={category.key}
                    currentRating={ratings[category.key]}
                  />
                  <span className="text-sm font-bold text-gray-600 w-12">
                    {ratings[category.key] > 0 ? `${ratings[category.key]}/5` : "-"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Average Rating Display */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl text-center">
          <p className="text-sm text-gray-600 mb-1">Average Rating</p>
          <p className="text-3xl font-bold text-green-600">
            {(Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)} / 5.0
          </p>
        </div>

        {/* Feedback Text */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <MessageSquare size={16} className="inline mr-1" />
            Additional Comments (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows="5"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
            placeholder="Share your thoughts, suggestions, or report any issues..."
          />
        </div>

        {/* Submit Button */}
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
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit Feedback
            </>
          )}
        </button>
      </form>
    </div>
    </div>
    </div>
  );
};

export default FeedbackForm;
