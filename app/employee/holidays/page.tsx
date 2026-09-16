"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarCheck,
  Clock3,
  MapPin,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Holiday = {
  id: string;
  name: string;
  date: string;
  type: string | null;
  recurring: boolean;
  description: string | null;
  active: boolean;
};

export default function EmployeeHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // LOAD HOLIDAYS
  // ============================================================

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
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
        console.error("Holiday fetch error:", error);

        setErrorMessage(
          "Unable to load company holidays."
        );

        return;
      }

      setHolidays((data || []) as Holiday[]);
    } catch (error) {
      console.error("Holiday loading error:", error);

      setErrorMessage(
        "Unable to load company holidays."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    fetchHolidays();
  }, []);

  // ============================================================
  // REALTIME
  // ============================================================

  useEffect(() => {
    const channel = supabase
      .channel("employee-company-holidays")
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
  }, []);

  // ============================================================
  // CURRENT YEAR
  // ============================================================

  const currentYear = new Date().getFullYear();

  const selectedYear =
    holidays.length > 0
      ? new Date(
          `${holidays[0].date}T00:00:00`
        ).getFullYear()
      : currentYear;

  // ============================================================
  // YEAR HOLIDAYS
  // ============================================================

  const yearHolidays = useMemo(() => {
    return holidays.filter((holiday) => {
      const holidayYear = new Date(
        `${holiday.date}T00:00:00`
      ).getFullYear();

      return holidayYear === selectedYear;
    });
  }, [holidays, selectedYear]);

  // ============================================================
  // UPCOMING HOLIDAY COUNT
  // ============================================================

  const upcomingCount = useMemo(() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return yearHolidays.filter((holiday) => {
      const holidayDate = new Date(
        `${holiday.date}T00:00:00`
      );

      return holidayDate >= today;
    }).length;
  }, [yearHolidays]);

  // ============================================================
  // NEXT UPCOMING HOLIDAY
  // ============================================================

  const upcomingHoliday = useMemo(() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return yearHolidays.find((holiday) => {
      const holidayDate = new Date(
        `${holiday.date}T00:00:00`
      );

      return holidayDate >= today;
    });
  }, [yearHolidays]);

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // GET DAY
  // ============================================================

  const getDay = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString("en-IN", {
      weekday: "long",
    });
  };

  // ============================================================
  // GET MONTH
  // ============================================================

  const getMonth = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    )
      .toLocaleDateString("en-IN", {
        month: "short",
      })
      .toUpperCase();
  };

  // ============================================================
  // GET DATE NUMBER
  // ============================================================

  const getDateNumber = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    )
      .getDate()
      .toString()
      .padStart(2, "0");
  };

  // ============================================================
  // CHECK UPCOMING
  // ============================================================

  const isUpcoming = (date: string) => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const holidayDate = new Date(
      `${date}T00:00:00`
    );

    return holidayDate >= today;
  };

  return (
    <main className="min-h-screen bg-[#f7f9fc] px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-6">
          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarDays
                size={22}
                className="text-[#034EA2]"
              />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Company Holidays
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                SIGMANIX Tech Solutions holiday calendar
              </p>
            </div>

          </div>
        </div>

        {/* =====================================================
            SUMMARY CARDS
        ===================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">

          {/* TOTAL */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Total Holidays
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {yearHolidays.length}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarCheck
                  size={20}
                  className="text-blue-600"
                />
              </div>

            </div>
          </div>

          {/* UPCOMING */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Upcoming
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2">
                  {upcomingCount}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Clock3
                  size={20}
                  className="text-orange-600"
                />
              </div>

            </div>
          </div>

          {/* YEAR */}

          <div className="col-span-2 lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Holiday Calendar
                </p>

                <p className="text-2xl sm:text-3xl font-bold text-[#034EA2] mt-2">
                  {selectedYear}
                </p>
              </div>

              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Sparkles
                  size={20}
                  className="text-purple-600"
                />
              </div>

            </div>
          </div>

        </div>

        {/* =====================================================
            NEXT UPCOMING HOLIDAY
        ===================================================== */}

        {!loading && upcomingHoliday && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 shadow-sm overflow-hidden">

            <div className="p-4 sm:p-6">

              <div className="flex items-center justify-between gap-4">

                {/* LEFT */}

                <div className="min-w-0">

                  <div className="flex items-center gap-2 mb-2">

                    <div className="w-8 h-8 rounded-lg bg-[#034EA2] flex items-center justify-center">
                      <CalendarCheck
                        size={16}
                        className="text-white"
                      />
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-[#034EA2] uppercase tracking-wide">
                      Upcoming Holiday
                    </p>

                  </div>

                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                    {upcomingHoliday.name}
                  </h2>

                  <p className="text-sm sm:text-base text-gray-600 mt-1">
                    {getDay(upcomingHoliday.date)}
                    {" · "}
                    {formatDate(upcomingHoliday.date)}
                  </p>

                  {upcomingHoliday.type && (
                    <span
                      className={`inline-flex mt-3 items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                        upcomingHoliday.type ===
                        "Tentative Holiday"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : upcomingHoliday.type ===
                            "National Holiday"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {upcomingHoliday.type}
                    </span>
                  )}

                </div>

                {/* DATE BOX */}

                <div className="w-[72px] sm:w-[84px] shrink-0 rounded-2xl overflow-hidden border border-blue-200 shadow-sm">

                  <div className="bg-[#034EA2] text-white text-xs sm:text-sm font-bold text-center py-1.5">
                    {getMonth(upcomingHoliday.date)}
                  </div>

                  <div className="bg-white text-center py-3">
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {getDateNumber(
                        upcomingHoliday.date
                      )}
                    </span>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            NO UPCOMING HOLIDAY
        ===================================================== */}

        {!loading &&
          !errorMessage &&
          yearHolidays.length > 0 &&
          !upcomingHoliday && (
            <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <CalendarCheck
                    size={19}
                    className="text-gray-500"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    No upcoming holidays
                  </p>

                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    All company holidays for {selectedYear} have passed.
                  </p>
                </div>

              </div>

            </div>
          )}

        {/* =====================================================
            HOLIDAY LIST
        ===================================================== */}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">

            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Holiday Calendar {selectedYear}
            </h2>

            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Official company holidays for employees
            </p>

          </div>

          {/* LOADING */}

          {loading && (
            <div className="py-16 flex flex-col items-center justify-center">

              <div className="w-8 h-8 border-2 border-gray-200 border-t-[#034EA2] rounded-full animate-spin" />

              <p className="text-sm text-gray-500 mt-3">
                Loading holidays...
              </p>

            </div>
          )}

          {/* ERROR */}

          {!loading && errorMessage && (
            <div className="py-12 px-4 text-center">

              <p className="text-sm text-red-600">
                {errorMessage}
              </p>

            </div>
          )}

          {/* NO HOLIDAYS */}

          {!loading &&
            !errorMessage &&
            yearHolidays.length === 0 && (
              <div className="py-16 text-center">

                <CalendarDays
                  size={36}
                  className="text-gray-300 mx-auto"
                />

                <p className="text-sm font-medium text-gray-700 mt-3">
                  No company holidays available
                </p>

              </div>
            )}

          {/* HOLIDAY CARDS */}

          {!loading &&
            !errorMessage &&
            yearHolidays.length > 0 && (
              <div className="divide-y divide-gray-100">

                {yearHolidays.map((holiday) => {

                  const upcoming =
                    isUpcoming(holiday.date);

                  return (
                    <div
                      key={holiday.id}
                      className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition"
                    >

                      <div className="flex items-start gap-4">

                        {/* DATE BOX */}

                        <div
                          className={`w-14 sm:w-16 shrink-0 rounded-xl overflow-hidden border ${
                            upcoming
                              ? "border-blue-200"
                              : "border-gray-200"
                          }`}
                        >

                          <div
                            className={`text-[10px] sm:text-xs font-bold text-center py-1 ${
                              upcoming
                                ? "bg-[#034EA2] text-white"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {getMonth(holiday.date)}
                          </div>

                          <div className="bg-white text-center py-2">

                            <span className="text-xl sm:text-2xl font-bold text-gray-900">
                              {getDateNumber(
                                holiday.date
                              )}
                            </span>

                          </div>

                        </div>

                        {/* CONTENT */}

                        <div className="flex-1 min-w-0">

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">

                            <div>

                              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                                {holiday.name}
                              </h3>

                              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                {getDay(holiday.date)}
                                {" · "}
                                {formatDate(
                                  holiday.date
                                )}
                              </p>

                            </div>

                            <div>

                              {holiday.type && (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                                    holiday.type ===
                                    "Tentative Holiday"
                                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                                      : holiday.type ===
                                        "National Holiday"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-blue-50 text-blue-700 border border-blue-200"
                                  }`}
                                >
                                  {holiday.type}
                                </span>
                              )}

                            </div>

                          </div>

                          {holiday.description && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-5">
                              {holiday.description}
                            </p>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

        </div>

        {/* =====================================================
            COMPANY POLICY
        ===================================================== */}

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 sm:p-5">

          <div className="flex items-start gap-3">

            <MapPin
              size={19}
              className="text-[#034EA2] shrink-0 mt-0.5"
            />

            <div>

              <h3 className="text-sm font-semibold text-gray-900">
                Holiday Information
              </h3>

              <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-5">
                Holidays are observed according to company policy.
                Tentative holidays may change based on official
                announcements. Any updates will be communicated by HR.
              </p>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}