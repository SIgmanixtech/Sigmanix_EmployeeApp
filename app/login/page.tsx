"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0;

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: authError,
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

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

      if (profile.role !== "employee") {
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

      if (
        profile.must_change_password === true
      ) {
        router.replace(
          "/employee/change-password"
        );

        return;
      }

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
    <div className="sigmanix-login-bg min-h-screen flex items-center justify-center px-4 py-6">

      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="sigmanix-particle" />
        <span className="sigmanix-particle" />
        <span className="sigmanix-particle" />
        <span className="sigmanix-particle" />
        <span className="sigmanix-particle" />
        <span className="sigmanix-particle" />
      </div>

      <div className="relative z-10 w-full max-w-[400px] min-h-[600px] bg-white rounded-[42px] shadow-2xl px-8 py-10 flex flex-col">

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
                name="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Email"
                autoComplete="email"
                inputMode="email"
                className="flex-1 min-w-0 bg-transparent outline-none text-lg font-medium text-black placeholder:text-gray-500"
              />

            </div>
          </div>

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
                name="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                placeholder="Password"
                autoComplete="current-password"
                className="flex-1 min-w-0 bg-transparent outline-none text-lg font-medium text-black placeholder:text-gray-500"
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous
                  )
                }
                className="relative z-10 flex items-center justify-center text-gray-400 hover:text-black active:text-black cursor-pointer p-1 pointer-events-auto"
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
            <p className="text-red-600 text-center mt-5 text-sm">
              {error}
            </p>
          )}

          <div className="h-8" />

          {/* Login */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={
                !canSubmit || loading
              }
              className={`relative z-10 w-[340px] max-w-full h-12 rounded-2xl text-xl font-semibold transition-all pointer-events-auto ${
                canSubmit && !loading
                  ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 cursor-pointer"
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