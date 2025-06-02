"use client";

import { createContext, useContext } from "react";
import toast, { Toaster } from "react-hot-toast";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const showToast = {
    success: (message, options = {}) => {
      return toast.success(message, {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '16px 20px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#10b981',
        },
        ...options,
      });
    },

    error: (message, options = {}) => {
      return toast.error(message, {
        duration: 6000,
        position: 'bottom-right',
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '16px 20px',
        },
        iconTheme: {
          primary: '#fff',
          secondary: '#ef4444',
        },
        ...options,
      });
    },

    warning: (message, options = {}) => {
      return toast((t) => (
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{message}</p>
          </div>
        </div>
      ), {
        duration: 5000,
        position: 'bottom-right',
        style: {
          background: '#fbbf24',
          color: '#1f2937',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '16px 20px',
        },
        ...options,
      });
    },

    info: (message, options = {}) => {
      return toast((t) => (
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{message}</p>
          </div>
        </div>
      ), {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: '#3b82f6',
          color: '#fff',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '16px 20px',
        },
        ...options,
      });
    },

    loading: (message, options = {}) => {
      return toast.loading(message, {
        position: 'bottom-right',
        style: {
          background: '#6366f1',
          color: '#fff',
          fontWeight: '500',
          borderRadius: '12px',
          padding: '16px 20px',
        },
        ...options,
      });
    },

    promise: (promise, messages) => {
      return toast.promise(promise, {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Error occurred',
      }, {
        position: 'bottom-right',
        style: {
          borderRadius: '12px',
          padding: '16px 20px',
          fontWeight: '500',
        },
      });
    },

    dismiss: (toastId) => {
      if (toastId) {
        toast.dismiss(toastId);
      } else {
        toast.dismiss();
      }
    },

    custom: (jsx, options = {}) => {
      return toast.custom(jsx, {
        position: 'bottom-right',
        ...options,
      });
    }
  };

  // Error categorization helper
  const categorizeError = (error) => {
    const errorMessage = error?.message || error || 'Unknown error';
    
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return { type: 'notfound', icon: '🔍' };
    } else if (errorMessage.includes('405') || errorMessage.includes('Method Not Allowed')) {
      return { type: 'method', icon: '🚫' };
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return { type: 'network', icon: '🌐' };
    } else if (errorMessage.includes('wallet') || errorMessage.includes('connect') || errorMessage.includes('sign')) {
      return { type: 'wallet', icon: '👛' };
    } else if (errorMessage.includes('contract') || errorMessage.includes('blockchain') || errorMessage.includes('transaction')) {
      return { type: 'blockchain', icon: '⛓️' };
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('required')) {
      return { type: 'validation', icon: '⚠️' };
    } else {
      return { type: 'general', icon: '❌' };
    }
  };

  const showCategorizedError = (error, customMessage = null) => {
    const category = categorizeError(error);
    const errorMessage = error?.message || error || 'Unknown error occurred';
    const message = customMessage || errorMessage;
    
    return showToast.error(`${category.icon} ${message}`, {
      duration: 6000,
    });
  };

  const showIssueReport = (issues) => {
    if (!issues || issues.length === 0) {
      showToast.success('✅ No issues found!');
      return;
    }

    // Show summary first
    showToast.warning(`⚠️ Found ${issues.length} issue${issues.length > 1 ? 's' : ''} in the application`, {
      duration: 8000,
    });

    // Show individual issues
    issues.forEach((issue, index) => {
      setTimeout(() => {
        showToast.error(`Issue ${index + 1}: ${issue}`, {
          duration: 7000,
        });
      }, (index + 1) * 1000);
    });
  };

  const value = {
    toast: showToast,
    categorizeError,
    showCategorizedError,
    showIssueReport,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster 
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          bottom: 20,
          right: 20,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            fontWeight: '500',
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
} 