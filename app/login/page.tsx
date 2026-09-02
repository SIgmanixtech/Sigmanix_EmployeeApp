"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0;

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    // =========================================
    // VALIDATE EMAIL
    // =========================================

    if (!emailRegex.test(email.trim())) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (!canSubmit) {
      return;
    }

    setLoading(true);

    try {
      // =========================================
      // LOGIN WITH SUPABASE
      // =========================================

      const {
        data,
        error: authError,
      } =
        await supabase.auth.signInWithPassword(
          {
            email: email
              .trim()
              .toLowerCase(),
            password,
          }
        );

      if (authError) {
        console.error(
          "Authentication error:",
          authError
        );

        setError(
          "Invalid email or password."
        );

        return;
      }

      if (!data.user) {
        setError(
          "Unable to get logged-in user."
        );

        return;
      }

      // =========================================
      // GET EMPLOYEE PROFILE
      // =========================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "role, employee_id, must_change_password"
        )
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile fetch error:",
          profileError
        );

        await supabase.auth.signOut();

        setError(
          "Unable to load your employee profile."
        );

        return;
      }

      if (!profile) {
        await supabase.auth.signOut();

        setError(
          "Your account is not linked to an employee profile. Please contact admin."
        );

        return;
      }

      // =========================================
      // EMPLOYEE APP ONLY
      // =========================================

      if (
        profile.role !== "employee"
      ) {
        await supabase.auth.signOut();

        setError(
          "This application is only for employees."
        );

        return;
      }

      if (!profile.employee_id) {
        await supabase.auth.signOut();

        setError(
          "No employee record is linked to this account. Please contact admin."
        );

        return;
      }

      // =========================================
      // FIRST LOGIN PASSWORD CHANGE
      // =========================================

      if (
        profile.must_change_password ===
        true
      ) {
        router.replace(
          "/employee/change-password"
        );

        return;
      }

      // =========================================
      // EMPLOYEE DASHBOARD
      // =========================================

      router.replace(
        "/employee/dashboard"
      );
    } catch (error) {
      console.error(
        "Unexpected login error:",
        error
      );

      await supabase.auth.signOut();

      setError(
        "Something went wrong while logging in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-800 via-blue-600 to-blue-400 px-4 py-6">
      <div className="w-full max-w-[400px] min-h-[600px] h-[80vh] max-h-[500px] bg-white rounded-[42px] shadow-2xl px-8 py-10 flex flex-col">

        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="SIGMANIX TECH"
            width={300}
            height={90}
            className="w-64 h-auto object-contain"
            priority
          />
        </div>

        {/* Heading */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-black">
            Welcome Back
          </h2>

          <p className="text-lg text-gray-400 mt-3">
            Login to continue to SigmaNix HRMS
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="flex flex-col flex-1 mt-8"
        >
          <div className="h-8" />

          {/* Email */}
          <div className="flex justify-center">
            <div className="w-[340px] max-w-full flex items-center bg-gray-100 rounded-2xl h-12 px-5">
              <Mail
                size={18}
                className="text-black mr-4"
              />

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="   Email"
                autoComplete="email"
                className="flex-1 min-w-0 bg-transparent outline-none text-lg font-medium text-black placeholder:text-gray-500"
              />
            </div>
          </div>

          {email.length > 0 &&
            !emailRegex.test(
              email.trim()
            ) && (
              <p className="text-red-600 text-center mt-2">
                Please enter a valid email
                address.
              </p>
            )}

          <div className="h-8" />

          {/* Password */}
          <div className="flex justify-center">
            <div className="w-[340px] max-w-full flex items-center bg-gray-100 rounded-2xl h-12 px-5">
              <Lock
                size={24}
                className="text-black mr-4"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="   Password"
                autoComplete="current-password"
                className="flex-1 min-w-0 bg-transparent outline-none text-lg font-medium text-black placeholder:text-gray-500"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="text-gray-400 hover:text-black"
              >
                {showPassword ? (
                  <EyeOff size={22} />
                ) : (
                  <Eye size={22} />
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-center mt-5">
              {error}
            </p>
          )}

          <div className="h-8" />

          {/* Login Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={
                !canSubmit || loading
              }
              className={`w-[340px] max-w-full h-12 rounded-2xl text-xl font-semibold transition-all ${
                canSubmit && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {loading
                ? "Signing in..."
                : "Login"}
            </button>
          </div>

          <div className="flex-1" />

          <p className="text-center text-gray-400 text-lg mt-10">
            SigmaNix Tech Solutions
          </p>
        </form>
      </div>
    </div>
  );
}