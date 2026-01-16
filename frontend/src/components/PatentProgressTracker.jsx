import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, FileText, Eye, Search, Shield, Award } from 'lucide-react';

const PatentProgressTracker = ({ filing }) => {
  const [showNotification, setShowNotification] = useState(false);
  
  // Define the 5 stages with their status
  const stages = [
    {
      id: 1,
      title: 'Patent Filed',
      description: 'Application submitted successfully',
      icon: FileText,
      completed: filing.stage1Filed || false,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Admin Review',
      description: 'Initial review by administrator',
      icon: Eye,
      completed: filing.stage2AdminReview || false,
      color: 'purple'
    },
    {
      id: 3,
      title: 'Technical Review',
      description: 'Technical evaluation completed',
      icon: Search,
      completed: filing.stage3TechnicalReview || false,
      color: 'indigo'
    },
    {
      id: 4,
      title: 'Final Verification',
      description: 'Final verification and checks',
      icon: Shield,
      completed: filing.stage4Verification || false,
      color: 'green'
    },
    {
      id: 5,
      title: 'Patent Granted',
      description: 'Patent approved and published',
      icon: Award,
      completed: filing.stage5Granted || false,
      color: 'amber'
    }
  ];

  // Calculate current stage
  const currentStage = stages.findIndex(stage => !stage.completed);
  const allCompleted = stages.every(stage => stage.completed);
  const completedCount = stages.filter(stage => stage.completed).length;

  // Show notification when patent is granted
  useEffect(() => {
    if (allCompleted && !showNotification) {
      setShowNotification(true);
      // Browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🎉 Patent Granted!', {
          body: 'Congratulations! Your patent has been successfully granted.',
          icon: '/patent-icon.png'
        });
      }
      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [allCompleted]);

  // Color mapping for different stages
  const getColorClasses = (color, isActive = false, isCompleted = false) => {
    if (isCompleted) {
      return {
        bg: 'bg-green-100',
        border: 'border-green-500',
        text: 'text-green-700',
        icon: 'text-green-600'
      };
    }
    if (isActive) {
      const colors = {
        blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700', icon: 'text-blue-600' },
        purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700', icon: 'text-purple-600' },
        indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-700', icon: 'text-indigo-600' },
        green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700', icon: 'text-green-600' },
        amber: { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-700', icon: 'text-amber-600' }
      };
      return colors[color] || colors.blue;
    }
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-500',
      icon: 'text-gray-400'
    };
  };

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {showNotification && allCompleted && (
        <div className="fixed top-4 right-4 z-50 animate-[slideIn_0.5s_ease-out]">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4 shadow-2xl flex items-center gap-3 max-w-md">
            <Award size={32} className="text-yellow-300 animate-bounce" />
            <div>
              <p className="font-bold text-lg">Patent Granted!</p>
              <p className="text-sm text-green-50">Your patent has been officially approved</p>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Success Banner with Confetti - Shows only when all stages are complete */}
      {allCompleted && (
        <div className="relative mb-6 overflow-hidden">
          {/* Confetti Animation */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-0 left-[10%] w-3 h-3 bg-yellow-400 rounded-full animate-[fall_3s_linear_infinite]" style={{animationDelay: '0s'}} />
            <div className="absolute top-0 left-[25%] w-2 h-2 bg-red-500 rounded-full animate-[fall_2.5s_linear_infinite]" style={{animationDelay: '0.5s'}} />
            <div className="absolute top-0 left-[40%] w-3 h-3 bg-blue-500 rounded-full animate-[fall_3.5s_linear_infinite]" style={{animationDelay: '0.2s'}} />
            <div className="absolute top-0 left-[55%] w-2 h-2 bg-green-500 rounded-full animate-[fall_2.8s_linear_infinite]" style={{animationDelay: '0.8s'}} />
            <div className="absolute top-0 left-[70%] w-3 h-3 bg-purple-500 rounded-full animate-[fall_3.2s_linear_infinite]" style={{animationDelay: '0.3s'}} />
            <div className="absolute top-0 left-[85%] w-2 h-2 bg-pink-500 rounded-full animate-[fall_2.7s_linear_infinite]" style={{animationDelay: '0.6s'}} />
            <div className="absolute top-0 left-[15%] w-2 h-2 bg-orange-500 rounded-full animate-[fall_3.3s_linear_infinite]" style={{animationDelay: '1s'}} />
            <div className="absolute top-0 left-[60%] w-3 h-3 bg-cyan-500 rounded-full animate-[fall_2.9s_linear_infinite]" style={{animationDelay: '0.4s'}} />
          </div>
          
          <div className="relative bg-gradient-to-r from-green-500 via-emerald-600 to-green-500 text-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="animate-bounce">
                <Award size={64} className="text-yellow-300 drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2 animate-pulse">🎉 Patent Successfully Granted! 🎉</h3>
                <p className="text-green-50 text-xl">
                  Congratulations! Your patent has been officially approved and published.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar with Running Character */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Progress: {completedCount}/{stages.length} Stages Completed
          </span>
          <span className="text-sm font-bold text-blue-600">
            {Math.round((completedCount / stages.length) * 100)}%
          </span>
        </div>
        <div className="relative w-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full h-6 overflow-visible shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allCompleted ? 'bg-gradient-to-r from-green-400 via-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600'
            } shadow-lg`}
            style={{ width: `${(completedCount / stages.length) * 100}%` }}
          />
          
          {/* Running Motu Character */}
          <div 
            className="absolute -translate-y-1/2"
            style={{ 
              left: `${Math.max(2, Math.min(98, (completedCount / stages.length) * 100 - 2))}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.5s ease-out'
            }}
          >
            {allCompleted ? (
              <div 
                className="text-4xl filter drop-shadow-lg"
                style={{
                  animation: 'celebrate 1s ease-in-out forwards'
                }}
              >
                🏆
              </div>
            ) : (
              <div className="relative">
                <div 
                  className="text-3xl filter drop-shadow-lg"
                  style={{
                    animation: 'runAnimation 0.4s ease-in-out infinite',
                    transform: 'scaleX(-1)'
                  }}
                >
                  🏃
                </div>
                {/* Speed lines */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex gap-1 opacity-60">
                  <div className="w-2 h-0.5 bg-blue-500 animate-pulse" />
                  <div className="w-3 h-0.5 bg-purple-500 animate-pulse" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-0.5 bg-blue-500 animate-pulse" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stages Display - Desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-12 left-0 right-0 h-1 bg-gray-200" style={{ zIndex: 0 }} />
          <div 
            className={`absolute top-12 left-0 h-1 transition-all duration-500 ${
              allCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${(completedCount / stages.length) * 100}%`,
              zIndex: 1 
            }}
          />

          {/* Running Man on Stages Timeline */}
          {!allCompleted && (
            <div 
              className="absolute top-12 -translate-y-1/2"
              style={{ 
                left: `${(completedCount / stages.length) * 100}%`,
                zIndex: 3,
                transition: 'left 0.8s ease-out'
              }}
            >
              <div className="relative -translate-x-1/2">
                <div 
                  className="text-4xl filter drop-shadow-lg"
                  style={{
                    animation: 'runAnimation 0.4s ease-in-out infinite',
                    transform: 'scaleX(-1)'
                  }}
                >
                  🏃
                </div>
                {/* Speed lines */}
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex gap-1 opacity-70">
                  <div className="w-3 h-0.5 bg-blue-500 animate-pulse" />
                  <div className="w-4 h-0.5 bg-purple-500 animate-pulse" style={{animationDelay: '0.1s'}} />
                  <div className="w-3 h-0.5 bg-blue-500 animate-pulse" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            </div>
          )}

          {/* Trophy when completed */}
          {allCompleted && (
            <div 
              className="absolute top-12 -translate-y-1/2"
              style={{ 
                left: '100%',
                zIndex: 3
              }}
            >
              <div className="relative -translate-x-1/2">
                <div 
                  className="text-5xl filter drop-shadow-lg"
                  style={{
                    animation: 'celebrate 1s ease-in-out forwards'
                  }}
                >
                  🏆
                </div>
              </div>
            </div>
          )}

          <div className="relative flex justify-between" style={{ zIndex: 2 }}>
            {stages.map((stage, index) => {
              const isActive = index === currentStage;
              const isCompleted = stage.completed;
              const colors = getColorClasses(stage.color, isActive, isCompleted);
              const Icon = stage.icon;

              return (
                <div key={stage.id} className="flex flex-col items-center" style={{ width: '20%' }}>
                  {/* Stage Circle */}
                  <div className={`
                    w-24 h-24 rounded-full border-4 ${colors.border} ${colors.bg}
                    flex items-center justify-center mb-3 relative
                    transition-all duration-300
                    ${isActive ? 'animate-bounce' : ''}
                    ${isCompleted ? 'scale-110' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle size={40} className={colors.icon} strokeWidth={2.5} />
                    ) : (
                      <Icon size={40} className={colors.icon} />
                    )}
                    
                    {/* Stage Number Badge */}
                    <div className={`
                      absolute -top-2 -right-2 w-8 h-8 rounded-full 
                      ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-400'}
                      text-white flex items-center justify-center text-sm font-bold
                      shadow-lg
                    `}>
                      {stage.id}
                    </div>
                  </div>

                  {/* Stage Info */}
                  <div className="text-center px-2">
                    <h4 className={`font-bold text-sm mb-1 ${colors.text}`}>
                      {stage.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {stage.description}
                    </p>
                    {isCompleted && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        ✓ Complete
                      </span>
                    )}
                    {isActive && !isCompleted && (
                      <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full animate-pulse">
                        ⏳ In Progress
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stages Display - Mobile */}
      <div className="md:hidden space-y-4">
        {stages.map((stage, index) => {
          const isActive = index === currentStage;
          const isCompleted = stage.completed;
          const colors = getColorClasses(stage.color, isActive, isCompleted);
          const Icon = stage.icon;

          return (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Stage Circle */}
              <div className={`
                w-16 h-16 rounded-full border-4 ${colors.border} ${colors.bg}
                flex items-center justify-center flex-shrink-0 relative
                ${isActive ? 'animate-pulse' : ''}
              `}>
                {isCompleted ? (
                  <CheckCircle size={28} className={colors.icon} strokeWidth={2.5} />
                ) : (
                  <Icon size={28} className={colors.icon} />
                )}
                <div className={`
                  absolute -top-2 -right-2 w-6 h-6 rounded-full 
                  ${isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-400'}
                  text-white flex items-center justify-center text-xs font-bold
                `}>
                  {stage.id}
                </div>
              </div>

              {/* Stage Info */}
              <div className="flex-1 pt-1">
                <h4 className={`font-bold text-base mb-1 ${colors.text}`}>
                  {stage.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {stage.description}
                </p>
                {isCompleted && (
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    ✓ Complete
                  </span>
                )}
                {isActive && !isCompleted && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full animate-pulse">
                    ⏳ In Progress
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700 text-center">
          {allCompleted ? (
            <span className="font-bold text-green-700">
              ✅ Your patent application has been successfully processed and granted!
            </span>
          ) : currentStage >= 0 ? (
            <span>
              <span className="font-bold text-blue-700">Current Status:</span> Your patent is currently in{' '}
              <span className="font-bold">{stages[currentStage]?.title}</span> stage.
              {currentStage < 4 && ' Next: ' + stages[currentStage + 1]?.title}
            </span>
          ) : (
            <span className="font-bold text-gray-700">Processing your patent application...</span>
          )}
        </p>
      </div>
      
      {/* Joyful Congratulations Message - Shows only when granted */}
      {allCompleted && (
        <div className="mt-8 relative overflow-hidden rounded-2xl">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-[gradient_3s_ease_infinite]" />
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-[gradient_3s_ease_infinite] opacity-50" style={{animationDelay: '1.5s'}} />
          
          <div className="relative bg-gradient-to-br from-yellow-50/95 via-orange-50/95 to-pink-50/95 backdrop-blur-sm p-8 text-center">
            {/* Sparkles */}
            <div className="absolute top-4 left-4 text-2xl animate-[spin_3s_linear_infinite]">✨</div>
            <div className="absolute top-4 right-4 text-2xl animate-[spin_3s_linear_infinite]" style={{animationDelay: '1s'}}>✨</div>
            <div className="absolute bottom-4 left-8 text-3xl animate-bounce">🎊</div>
            <div className="absolute bottom-4 right-8 text-3xl animate-bounce" style={{animationDelay: '0.5s'}}>🎊</div>
            
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent animate-pulse">
              🎉 CONGRATULATIONS! 🎉
            </h2>
            
            <div className="space-y-3">
              <p className="text-2xl md:text-3xl font-bold text-gray-800">
                Your Patent Has Been <span className="text-green-600">GRANTED</span>! 🏆
              </p>
              
              <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto">
                <span className="font-semibold text-purple-600">Amazing achievement!</span> Your innovation is now officially protected and recognized.
              </p>
              
              <div className="flex items-center justify-center gap-4 mt-6 text-4xl">
                <span className="animate-bounce">🎯</span>
                <span className="animate-bounce" style={{animationDelay: '0.1s'}}>🌟</span>
                <span className="animate-bounce" style={{animationDelay: '0.2s'}}>🚀</span>
                <span className="animate-bounce" style={{animationDelay: '0.3s'}}>💡</span>
                <span className="animate-bounce" style={{animationDelay: '0.4s'}}>🏅</span>
              </div>
              
              <div className="mt-6 p-4 bg-white/80 backdrop-blur rounded-xl shadow-lg inline-block">
                <p className="text-sm md:text-base text-gray-600">
                  Your hard work and dedication have paid off. This patent represents your innovative spirit and contribution to the world of technology.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fall {
          0% { 
            transform: translateY(-20px) rotate(0deg); 
            opacity: 1; 
          }
          100% { 
            transform: translateY(400px) rotate(360deg); 
            opacity: 0; 
          }
        }
        @keyframes slideIn {
          from { 
            transform: translateX(400px); 
            opacity: 0; 
          }
          to { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        @keyframes runAnimation {
          0% { 
            transform: translateY(0px) scaleY(1) scaleX(-1); 
          }
          12.5% { 
            transform: translateY(-2px) scaleY(0.98) scaleX(-1); 
          }
          25% { 
            transform: translateY(-4px) scaleY(0.96) scaleX(-1); 
          }
          37.5% { 
            transform: translateY(-2px) scaleY(0.98) scaleX(-1); 
          }
          50% { 
            transform: translateY(0px) scaleY(1) scaleX(-1); 
          }
          62.5% { 
            transform: translateY(-2px) scaleY(0.98) scaleX(-1); 
          }
          75% { 
            transform: translateY(-4px) scaleY(0.96) scaleX(-1); 
          }
          87.5% { 
            transform: translateY(-2px) scaleY(0.98) scaleX(-1); 
          }
          100% { 
            transform: translateY(0px) scaleY(1) scaleX(-1); 
          }
        }
        @keyframes celebrate {
          0% { 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            transform: scale(1.5) rotate(180deg); 
          }
          100% { 
            transform: scale(1.2) rotate(360deg); 
          }
        }
        @keyframes gradient {
          0%, 100% { 
            transform: translateX(0%); 
          }
          50% { 
            transform: translateX(100%); 
          }
        }
      `}</style>
    </div>
  );
};

export default PatentProgressTracker;
