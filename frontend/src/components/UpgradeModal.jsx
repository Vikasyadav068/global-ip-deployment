import React, { useState, useEffect } from "react";
import { X, Check, Zap, Crown } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const UpgradeModal = ({ isOpen, onClose, userProfile, onAddNotification }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "Free",
      priceAmount: 0,
      icon: Zap,
      color: "from-gray-400 to-gray-600",
      features: [
        "Up to 10 searches per month",
        "Basic IP asset tracking",
        "Email support",
        "Dashboard access",
        "Standard reports",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "₹49",
      priceAmount: 49,
      period: "/month",
      icon: Crown,
      color: "from-blue-500 to-purple-600",
      popular: true,
      features: [
        "Unlimited searches",
        "Advanced IP asset analytics",
        "Priority support 24/7",
        "Real-time alerts",
        "Custom reports & exports",
        "API access",
        "Portfolio management tools",
        "Legal status tracking",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: "₹199",
      priceAmount: 199,
      period: "/month",
      icon: Crown,
      color: "from-purple-500 to-pink-600",
      features: [
        "Everything in Pro",
        "Dedicated account manager",
        "Custom integrations",
        "Advanced security features",
        "Team collaboration tools",
        "Unlimited team members",
        "SLA guarantee",
        "White-label options",
      ],
    },
  ];

  const handleUpgrade = async (plan) => {
    if (!userProfile?.uid) {
      alert("Please log in to upgrade your account");
      return;
    }

    // Free plan - no payment needed
    if (plan.priceAmount === 0) {
      await updateSubscription(plan);
      return;
    }

    // Paid plans - initiate Razorpay payment
    if (!razorpayLoaded) {
      alert("Payment gateway is loading. Please try again.");
      return;
    }

    setProcessing(true);
    setSelectedPlan(plan.id);

    try {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: plan.priceAmount * 100, // Razorpay accepts amount in paise
        currency: "INR",
        name: "Global IP Intelligence Platform",
        description: `${plan.name} Plan - Monthly Subscription`,
        image: "/logo.png", // Add your logo here
        handler: async function (response) {
          // Payment successful
          console.log("Payment successful:", response);
          await updateSubscription(plan, response);
        },
        prefill: {
          name: userProfile?.displayName || "",
          email: userProfile?.email || "",
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
            setSelectedPlan(null);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Failed to initiate payment. Please try again.");
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  const updateSubscription = async (plan, paymentResponse = null) => {
    setProcessing(true);
    setSelectedPlan(plan.id);

    try {
      // Calculate subscription end date (30 days from now)
      const currentDate = new Date();
      const endDate = new Date(currentDate);
      endDate.setDate(currentDate.getDate() + 30);

      // Prepare update data
      const updateData = {
        subscriptionType: plan.id,
        subscriptionPrice: plan.priceAmount,
        subscriptionStartDate: serverTimestamp(),
        subscriptionEndDate: endDate,
        subscriptionUpdatedAt: serverTimestamp(),
      };

      // Add payment details if payment was made
      if (paymentResponse) {
        updateData.lastPayment = {
          razorpayPaymentId: paymentResponse.razorpay_payment_id,
          razorpayOrderId: paymentResponse.razorpay_order_id || null,
          razorpaySignature: paymentResponse.razorpay_signature || null,
          amount: plan.priceAmount,
          currency: "INR",
          timestamp: serverTimestamp(),
        };
      }

      // Update user's subscription in Firestore
      const userRef = doc(db, "users", userProfile.uid);
      await updateDoc(userRef, updateData);

      // Create notification for subscription purchase
      if (onAddNotification) {
        onAddNotification({
          title: 'Subscription Upgraded Successfully!',
          message: `You've successfully upgraded to the ${plan.name} plan.`,
          details: {
            plan: plan.name,
            amount: plan.priceAmount,
            validUntil: endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            paymentId: paymentResponse?.razorpay_payment_id || 'N/A'
          }
        });
      }

      // Show success message
      alert(`Successfully upgraded to ${plan.name} plan! 🎉\nYour subscription is valid for 30 days.`);
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
        window.location.reload(); // Reload to reflect new subscription
      }, 1000);
    } catch (error) {
      console.error("Error updating subscription:", error);
      alert("Payment successful but failed to update subscription. Please contact support.");
    } finally {
      setProcessing(false);
      setSelectedPlan(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Upgrade Your Plan
            </h2>
            <p className="text-gray-600 mt-1">
              Choose the perfect plan for your needs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = userProfile?.subscriptionType === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 border-2 transition-all ${
                  plan.popular
                    ? "border-blue-500 shadow-xl scale-105"
                    : "border-gray-200 hover:border-gray-300"
                } ${isCurrentPlan ? "bg-gray-50" : "bg-white"}`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      CURRENT
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}
                >
                  <Icon size={24} className="text-white" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={isCurrentPlan || processing}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isCurrentPlan
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : processing && selectedPlan === plan.id
                      ? "bg-gray-400 text-white cursor-wait"
                      : plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg"
                      : "bg-gray-800 text-white hover:bg-gray-900"
                  }`}
                >
                  {isCurrentPlan
                    ? "Current Plan"
                    : processing && selectedPlan === plan.id
                    ? "Processing..."
                    : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-2xl">
          <p className="text-center text-sm text-gray-600">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
