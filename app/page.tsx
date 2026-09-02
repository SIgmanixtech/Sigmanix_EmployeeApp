"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [message, setMessage] =
    useState("");

  const testSupabase =
    async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setMessage(
          `Connection error: ${error.message}`
        );

        return;
      }

      setMessage(
        "Supabase connected successfully ✅"
      );

      console.log(
        "Session:",
        data.session
      );
    };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-900">
          SIGMANIX Employee App
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Supabase connection test
        </p>

        <button
          onClick={testSupabase}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          Test Supabase
        </button>

        {message && (
          <p className="mt-4 text-sm text-gray-700">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}