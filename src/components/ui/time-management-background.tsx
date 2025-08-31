import React from 'react';

export const TimeManagementBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/30 dark:from-blue-900/10 dark:via-transparent dark:to-indigo-900/10"></div>

      {/* Right Side - Time Management Illustration */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-40 dark:opacity-30 hidden lg:block">
        {/* Calendar Grid */}
        <div className="relative w-80 h-64">
          {/* Calendar Background */}
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="w-16 h-4 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
                <div className="flex space-x-2">
                  <div className="w-6 h-6 border border-gray-300/60 dark:border-gray-600/60 rounded"></div>
                  <div className="w-6 h-6 border border-gray-300/60 dark:border-gray-600/60 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {Array.from({length: 7}).map((_, i) => (
                  <div key={i} className="w-8 h-6 bg-gray-200/40 dark:bg-gray-700/40 rounded-sm"></div>
                ))}
                
                {/* Calendar Days */}
                {Array.from({length: 21}).map((_, i) => (
                  <div key={i} className={`w-8 h-6 rounded-sm ${
                    i === 10 || i === 15 ? 'bg-blue-500/60' : 
                    i === 5 || i === 18 ? 'bg-green-500/40' : 
                    'bg-gray-100/60 dark:bg-gray-700/40'
                  }`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Time Cards */}
          <div className="absolute -right-16 top-4 w-24 h-16 bg-white/90 dark:bg-gray-800/90 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="p-3">
              <div className="w-4 h-2 bg-blue-500/60 rounded mb-2"></div>
              <div className="w-12 h-2 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
            </div>
          </div>

          <div className="absolute -right-8 bottom-8 w-20 h-14 bg-white/90 dark:bg-gray-800/90 rounded-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="p-2">
              <div className="w-3 h-3 bg-green-500/60 rounded-full mb-1"></div>
              <div className="w-10 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded"></div>
            </div>
          </div>

          {/* Clock Element */}
          <div className="absolute -left-12 top-12 w-16 h-16 bg-white/90 dark:bg-gray-800/90 rounded-full border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm flex items-center justify-center">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-2 border-gray-300/60 dark:border-gray-600/60 rounded-full"></div>
              <div className="absolute top-1 left-1/2 w-0.5 h-3 bg-gray-400/80 -translate-x-0.5 origin-bottom rotate-90"></div>
              <div className="absolute top-2 left-1/2 w-0.5 h-2 bg-gray-600/80 -translate-x-0.5 origin-bottom rotate-45"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Subtle Elements */}
      <div className="absolute left-8 top-1/4 opacity-25 dark:opacity-20 hidden lg:block">
        {/* Progress Bars */}
        <div className="space-y-4">
          <div className="w-32 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
            <div className="w-20 h-2 bg-blue-500/30 rounded-full"></div>
          </div>
          <div className="w-28 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
            <div className="w-16 h-2 bg-green-500/30 rounded-full"></div>
          </div>
          <div className="w-24 h-2 bg-gray-200/40 dark:bg-gray-700/40 rounded-full">
            <div className="w-18 h-2 bg-purple-500/30 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Bottom Right - Stats Cards */}
      <div className="absolute bottom-16 right-16 opacity-30 dark:opacity-25 hidden xl:block">
        <div className="flex space-x-3">
          <div className="w-16 h-20 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3">
            <div className="w-6 h-6 bg-blue-500/40 rounded mb-2"></div>
            <div className="w-8 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded mb-1"></div>
            <div className="w-10 h-1 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
          </div>
          <div className="w-16 h-20 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm p-3">
            <div className="w-6 h-6 bg-green-500/40 rounded mb-2"></div>
            <div className="w-8 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded mb-1"></div>
            <div className="w-10 h-1 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};