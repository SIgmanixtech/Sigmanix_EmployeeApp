"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { triggerGlobalRefresh } from "@/lib/globalRefresh";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  // =====================================================
  // CLOSE POPUP
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    router.back();
  };

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess(false);

    // =================================================
    // VALIDATION
    // =================================================

    if (!newPassword) {
      setError(
        "Please enter a new password."
      );

      return;
    }

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setLoading(true);

    try {
      // =================================================
      // GET LOGGED-IN USER
      // =================================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(
          "User error:",
          userError
        );

        setError(
          "Your session has expired. Please login again."
        );

        await supabase.auth.signOut();

        router.replace("/login");

        return;
      }

      // =================================================
      // UPDATE AUTH PASSWORD
      // =================================================

      const {
        error: passwordError,
      } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (passwordError) {
        console.error(
          "Password update error:",
          passwordError
        );

        setError(
          passwordError.message
        );

        return;
      }

      // =================================================
      // GET CURRENT SESSION
      // =================================================

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session
      ) {
        console.error(
          "Session error:",
          sessionError
        );

        setError(
          "Password changed, but your session is unavailable. Please login again."
        );

        return;
      }

      // =================================================
      // COMPLETE PASSWORD CHANGE USING SERVER API
      // =================================================

      const response = await fetch(
        "/api/complete-password-change",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        console.error(
          "Complete password change error:",
          result
        );

        setError(
          result.error ||
            "Password changed, but your account could not be updated."
        );

        return;
      }

      // =================================================
      // REFRESH APP
      // =================================================

      triggerGlobalRefresh();

      // =================================================
      // SUCCESS
      // =================================================

      setSuccess(true);

      setTimeout(() => {
        router.replace(
          "/employee/dashboard"
        );
      }, 1200);

    } catch (error) {
      console.error(
        "Unexpected password change error:",
        error
      );

      setError(
        "Something went wrong while changing your password."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4 py-6">

      {/* =================================================
          POPUP
      ================================================= */}

      <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl p-7 sm:p-8">

        {/* =================================================
            CLOSE
        ================================================= */}

        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="
            absolute
            top-4
            right-4
            w-9
            h-9
            rounded-full
            flex
            items-center
            justify-center
            text-gray-400
            hover:text-gray-700
            hover:bg-gray-100
            transition
            disabled:opacity-50
          "
          title="Close"
        >
          <X size={19} />
        </button>

        {/* =================================================
            ICON
        ================================================= */}

        <div className="flex justify-center">

          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">

            <Lock
              size={26}
              className="text-blue-600"
            />

          </div>

        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="text-center mt-5">

          <h1 className="text-2xl font-bold text-gray-900">
            Change Your Password
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Create a secure password for your account.
          </p>

        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleChangePassword}
          className="mt-8"
        >

          {/* =================================================
              NEW PASSWORD
          ================================================= */}

          <div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>

            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  pl-4
                  pr-11
                  py-3
                  text-sm
                  text-black
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  hover:text-gray-700
                "
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>

            </div>

          </div>

          {/* =================================================
              CONFIRM PASSWORD
          ================================================= */}

          <div className="mt-5">

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>

            <div className="relative">

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  pl-4
                  pr-11
                  py-3
                  text-sm
                  text-black
                  outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:border-blue-500
                "
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  hover:text-gray-700
                "
              >
                {showConfirmPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>

            </div>

          </div>

          {/* =================================================
              PASSWORD INFORMATION
          ================================================= */}

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">

            <p className="text-xs text-blue-700">
              Use at least 8 characters.
              For better security, include uppercase,
              lowercase, numbers, and special characters.
            </p>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">

              <p className="text-sm text-red-600">
                {error}
              </p>

            </div>

          )}

          {/* =================================================
              SUCCESS
          ================================================= */}

          {success && (

            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">

              <div className="flex items-center gap-2">

                <CheckCircle2
                  size={18}
                  className="text-green-600"
                />

                <p className="text-sm text-green-700">
                  Password changed successfully.
                  Redirecting to your dashboard...
                </p>

              </div>

            </div>

          )}

          {/* =================================================
              BUTTON
          ================================================= */}

          <button
            type="submit"
            disabled={loading || success}
            className="
              w-full
              mt-6
              bg-blue-600
              hover:bg-blue-700
              text-white
              rounded-lg
              py-3
              text-sm
              font-semibold
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {loading
              ? "Changing Password..."
              : success
              ? "Password Changed"
              : "Change Password"}
          </button>

        </form>

      </div>

    </div>
  );
}