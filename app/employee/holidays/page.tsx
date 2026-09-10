"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Search,
  Sparkles,
  CalendarCheck2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


type Holiday = {
  id: string;
  name: string;
  date: string;
  type: string | null;
  recurring: boolean | null;
  description: string | null;
  active: boolean | null;
};

export default function EmployeeHolidaysPage() {
  const router = useRouter();

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // =====================================================
  // AUTH + FETCH HOLIDAYS
  // =====================================================

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        // ---------------------------------------------
        // 1. GET LOGGED-IN USER
        // ---------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        // ---------------------------------------------
        // 2. GET PROFILE
        // ---------------------------------------------

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, must_change_password")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Profile error:",
            profileError
          );
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // ---------------------------------------------
        // 3. EMPLOYEE ONLY
        // ---------------------------------------------

        if (profile.role !== "employee") {
          router.replace("/dashboard");
          return;
        }

        // ---------------------------------------------
        // 4. FORCE PASSWORD CHANGE
        // ---------------------------------------------

        if (
          profile.must_change_password === true
        ) {
          router.replace("/change-password");
          return;
        }

        // ---------------------------------------------
        // 5. FETCH HOLIDAYS
        // ---------------------------------------------

        const {
          data,
          error,
        } = await supabase
          .from("holidays")
          .select(
            `
            id,
            name,
            date,
            type,
            recurring,
            description,
            active
            `
          )
          .eq("active", true)
          .order("date", {
            ascending: true,
          });

        if (error) {
          console.error(
            "Holiday fetch error:",
            error
          );

          return;
        }

        setHolidays(
          data || []
        );
      } catch (error) {
        console.error(
          "Holidays page error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();

    // ---------------------------------------------
    // REALTIME HOLIDAY UPDATES
    // ---------------------------------------------

    const channel = supabase
      .channel("employee-holidays")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "holidays",
        },
        () => {
          fetchHolidays();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredHolidays = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return holidays;
    }

    return holidays.filter(
      (holiday) =>
        `${holiday.name} ${holiday.type || ""} ${holiday.description || ""}`
          .toLowerCase()
          .includes(value)
    );
  }, [
    holidays,
    search,
  ]);

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate = (
    value: string
  ) => {
    const date =
      new Date(
        `${value}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getDayName = (
    value: string
  ) => {
    const date =
      new Date(
        `${value}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        weekday: "long",
      }
    );
  };

  // =====================================================
  // CURRENT YEAR
  // =====================================================

  const currentYear =
    new Date().getFullYear();

  // =====================================================
  // THIS YEAR HOLIDAYS
  // =====================================================

  const thisYearCount = useMemo(() => {
    return holidays.filter(
      (holiday) =>
        new Date(
          `${holiday.date}T00:00:00`
        ).getFullYear() ===
        currentYear
    ).length;
  }, [
    holidays,
    currentYear,
  ]);

  // =====================================================
  // NEXT HOLIDAY
  // =====================================================

  const nextHoliday = useMemo(() => {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return holidays.find(
      (holiday) => {
        const holidayDate =
          new Date(
            `${holiday.date}T00:00:00`
          );

        return holidayDate >= today;
      }
    );
  }, [holidays]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">

        <p className="text-sm text-gray-500">
          Loading holidays...
        </p>

      </div>
    );
  }

  return (
    <main className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="mb-7">

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Company Holidays
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          View upcoming company holidays and important dates
        </p>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* THIS YEAR */}

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

              <CalendarCheck2
                size={19}
              />

            </div>

            <p className="text-sm font-medium text-gray-600">
              Holidays This Year
            </p>

          </div>

          <p className="text-3xl font-bold text-gray-900">
            {thisYearCount}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Active company holidays in {currentYear}
          </p>

        </div>

        {/* NEXT HOLIDAY */}

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">

              <Sparkles
                size={19}
              />

            </div>

            <p className="text-sm font-medium text-gray-600">
              Next Holiday
            </p>

          </div>

          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {nextHoliday
              ? nextHoliday.name
              : "No Upcoming Holiday"}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            {nextHoliday
              ? `${formatDate(
                  nextHoliday.date
                )} · ${getDayName(
                  nextHoliday.date
                )}`
              : "No upcoming holiday found"}
          </p>

        </div>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="relative max-w-md mb-6">

        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search holidays..."
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500"
        />

      </div>

      {/* =================================================
          HOLIDAY TABLE
      ================================================= */}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] text-sm">

            <thead className="bg-gray-50 border-b border-gray-200">

              <tr className="text-left text-gray-500">

                <th className="px-5 py-3 font-medium">
                  Holiday
                </th>

                <th className="px-5 py-3 font-medium">
                  Date
                </th>

                <th className="px-5 py-3 font-medium">
                  Day
                </th>

                <th className="px-5 py-3 font-medium">
                  Type
                </th>

                <th className="px-5 py-3 font-medium">
                  Description
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredHolidays.length === 0 ? (

                <tr>

                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">

                        <CalendarDays
                          size={22}
                          className="text-gray-400"
                        />

                      </div>

                      <p className="text-sm font-medium text-gray-700 mt-4">
                        No holidays found
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Active company holidays will appear here.
                      </p>

                    </div>

                  </td>

                </tr>

              ) : (

                filteredHolidays.map(
                  (holiday) => (

                    <tr
                      key={holiday.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition"
                    >

                      {/* NAME */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                            <CalendarDays
                              size={17}
                            />

                          </div>

                          <div>

                            <p className="font-medium text-gray-900">
                              {holiday.name}
                            </p>

                            {holiday.recurring && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Recurring Holiday
                              </p>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* DATE */}

                      <td className="px-5 py-4 text-gray-700">
                        {formatDate(
                          holiday.date
                        )}
                      </td>

                      {/* DAY */}

                      <td className="px-5 py-4 text-gray-600">
                        {getDayName(
                          holiday.date
                        )}
                      </td>

                      {/* TYPE */}

                      <td className="px-5 py-4">

                        <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                          {holiday.type ||
                            "Holiday"}
                        </span>

                      </td>

                      {/* DESCRIPTION */}

                      <td className="px-5 py-4 text-gray-600 max-w-[360px]">
                        {holiday.description ||
                          "-"}
                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </main>
  );
}