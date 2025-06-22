"use client";

import { createContext, useContext } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  AlertTriangle,
  Info,
  SearchX,
  Ban,
  WifiOff,
  Wallet as WalletIcon,
  Blocks,
  XCircle,
} from "lucide-react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const showToast = {
    success: (message, options = {}) => {
      return toast.success(message, {
        duration: 4000,
        position: "bottom-right",
        style: {
          background: "#10b981",
          color: "#fff",
          fontWeight: "500",
          borderRadius: "12px",
          padding: "16px 20px",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#10b981",
        },
        ...options,
      });
    },

    error: (message, options = {}) => {
      return toast.error(message, {
        duration: 6000,
        position: "bottom-right",
        style: {
          background: "#ef4444",
          color: "#fff",
          fontWeight: "500",
          borderRadius: "12px",
          padding: "16px 20px",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#ef4444",
        },
        ...options,
      });
    },

    warning: (message, options = {}) => {
      return toast(
        (t) => (
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-900" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{message}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: "bottom-right",
          style: {
            background: "#fbbf24",
            color: "#1f2937",
            fontWeight: "500",
            borderRadius: "12px",
            padding: "16px 20px",
          },
          ...options,
        }
      );
    },

    info: (message, options = {}) => {
      return toast(
        (t) => (
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{message}</p>
            </div>
          </div>
        ),
        {
          duration: 4000,
          position: "bottom-right",
          style: {
            background: "#3b82f6",
            color: "#fff",
            fontWeight: "500",
            borderRadius: "12px",
            padding: "16px 20px",
          },
          ...options,
        }
      );
    },

    loading: (message, options = {}) => {
      return toast.loading(message, {
        position: "bottom-right",
        style: {
          background: "#6366f1",
          color: "#fff",
          fontWeight: "500",
          borderRadius: "12px",
          padding: "16px 20px",
        },
        ...options,
      });
    },

    promise: (promise, messages) => {
      return toast.promise(
        promise,
        {
          loading: messages.loading || "Loading...",
          success: messages.success || "Success!",
          error: messages.error || "Error occurred",
        },
        {
          position: "bottom-right",
          style: {
            borderRadius: "12px",
            padding: "16px 20px",
            fontWeight: "500",
          },
        }
      );
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
        position: "bottom-right",
        ...options,
      });
    },
  };

  // Error categorization helper
  const categorizeError = (error) => {
    const errorMessage = error?.message || error || "Unknown error";

    if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
      return { type: "notfound", icon: <SearchX className="h-5 w-5" /> };
    } else if (
      errorMessage.includes("405") ||
      errorMessage.includes("Method Not Allowed")
    ) {
      return { type: "method", icon: <Ban className="h-5 w-5" /> };
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("timeout")
    ) {
      return { type: "network", icon: <WifiOff className="h-5 w-5" /> };
    } else if (
      errorMessage.includes("wallet") ||
      errorMessage.includes("connect") ||
      errorMessage.includes("sign")
    ) {
      return { type: "wallet", icon: <WalletIcon className="h-5 w-5" /> };
    } else if (
      errorMessage.includes("contract") ||
      errorMessage.includes("blockchain") ||
      errorMessage.includes("transaction")
    ) {
      return { type: "blockchain", icon: <Blocks className="h-5 w-5" /> };
    } else if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required")
    ) {
      return {
        type: "validation",
        icon: <AlertTriangle className="h-5 w-5" />,
      };
    } else {
      return { type: "general", icon: <XCircle className="h-5 w-5" /> };
    }
  };

  const showCategorizedError = (error, customMessage = null) => {
    const category = categorizeError(error);
    const errorMessage = error?.message || error || "Unknown error occurred";
    const message = customMessage || errorMessage;

    return toast(
      (t) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 text-white">{category.icon}</div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{message}</p>
          </div>
        </div>
      ),
      {
        duration: 6000,
        position: "bottom-right",
        style: {
          background: "#ef4444",
          color: "#fff",
          fontWeight: "500",
          borderRadius: "12px",
          padding: "16px 20px",
        },
      }
    );
  };

  const showIssueReport = (issues) => {
    if (!issues || issues.length === 0) {
      showToast.success("✅ No issues found!");
      return;
    }

    // Show summary first
    showToast.warning(
      `⚠️ Found ${issues.length} issue${
        issues.length > 1 ? "s" : ""
      } in the application`,
      {
        duration: 8000,
      }
    );

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
            borderRadius: "12px",
            fontWeight: "500",
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
