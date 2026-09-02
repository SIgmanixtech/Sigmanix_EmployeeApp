"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Clock,
  Boxes,
  Users,
  CalendarCheck,
  ArrowUpRight,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  designation: string;
  department: string;
};

export default function EmployeeDashboardPage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [
    checkedInToday,
    setCheckedInToday,
  ] = useState(false);

  const [
    checkInTime,
    setCheckInTime,
  ] = useState<string | null>(null);

  const [present, setPresent] =
    useState(0);

  const [totalDays, setTotalDays] =
    useState(0);

  const [assetCount, setAssetCount] =
    useState(0);

  const [teamSize, setTeamSize] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const todayISO =
    new Date()
      .toISOString()
      .split("T")[0];

  const monthPrefix =
    new Date()
      .toISOString()
      .slice(0, 7);

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // ================================================
        // AUTH USER
        // ================================================

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        // ================================================
        // PROFILE
        // ================================================

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "role, employee_id, must_change_password"
          )
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
          router.replace("/login");
          return;
        }

        // ================================================
        // EMPLOYEE ROLE
        // ================================================

        if (
          profile.role !==
          "employee"
        ) {
          router.replace(
            "/dashboard"
          );
          return;
        }

        // ================================================
        // PASSWORD CHANGE
        // ================================================

        if (
          profile
            .must_change_password ===
          true
        ) {
          router.replace(
            "/change-password"
          );
          return;
        }

        // ================================================
        // EMPLOYEE LINK
        // ================================================

        if (
          !profile.employee_id
        ) {
          setEmployee(null);
          return;
        }

        const employeeId =
          profile.employee_id;

        // ================================================
        // EMPLOYEE DETAILS
        // ================================================

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(
            "id, full_name, designation, department"
          )
          .eq(
            "id",
            employeeId
          )
          .maybeSingle();

        if (employeeError) {
          console.error(
            "Employee fetch error:",
            employeeError
          );
          return;
        }

        if (!employeeData) {
          setEmployee(null);
          return;
        }

        setEmployee(
          employeeData
        );

        // ================================================
        // TODAY ATTENDANCE
        // ================================================

        const {
          data: todayAttendance,
          error: todayError,
        } = await supabase
          .from("attendance")
          .select("check_in")
          .eq(
            "employee_id",
            employeeId
          )
          .eq(
            "date",
            todayISO
          )
          .maybeSingle();

        if (todayError) {
          console.error(
            "Today's attendance error:",
            todayError
          );
        }

        if (
          todayAttendance?.check_in
        ) {
          setCheckedInToday(
            true
          );

          setCheckInTime(
            todayAttendance.check_in
          );
        } else {
          setCheckedInToday(
            false
          );

          setCheckInTime(
            null
          );
        }

        // ================================================
        // MONTH ATTENDANCE
        // ================================================

        const {
          data: monthAttendance,
          error: monthError,
        } = await supabase
          .from("attendance")
          .select("status")
          .eq(
            "employee_id",
            employeeId
          )
          .gte(
            "date",
            `${monthPrefix}-01`
          );

        if (monthError) {
          console.error(
            "Monthly attendance error:",
            monthError
          );
        }

        const records =
          monthAttendance ||
          [];

        const presentCount =
          records.filter(
            (record) =>
              record.status ===
                "Present" ||
              record.status ===
                "Late"
          ).length;

        setPresent(
          presentCount
        );

        setTotalDays(
          records.length
        );

        // ================================================
        // ASSETS
        // ================================================

        const {
          count:
            assignedAssets,
          error: assetsError,
        } = await supabase
          .from("assets")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "assigned_to",
            employeeId
          );

        if (assetsError) {
          console.error(
            "Assets error:",
            assetsError
          );
        }

        setAssetCount(
          assignedAssets || 0
        );

        // ================================================
        // TEAM SIZE
        // ================================================

        if (
          employeeData.department
        ) {
          const {
            count:
              departmentCount,
            error: teamError,
          } = await supabase
            .from("employees")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq(
              "department",
              employeeData.department
            )
            .eq(
              "status",
              "Active"
            );

          if (teamError) {
            console.error(
              "Team error:",
              teamError
            );
          }

          setTeamSize(
            departmentCount ||
              0
          );
        }
      } catch (error) {
        console.error(
          "Employee dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [
    router,
    todayISO,
    monthPrefix,
  ]);

  // =====================================================
  // ATTENDANCE PERCENTAGE
  // =====================================================

  const attendancePct =
    useMemo(() => {
      if (!totalDays) {
        return 0;
      }

      return Math.round(
        (present /
          totalDays) *
          100
      );
    }, [
      present,
      totalDays,
    ]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">

        <p className="text-sm text-gray-500">
          Loading your dashboard...
        </p>

      </div>
    );
  }

  // =====================================================
  // NO EMPLOYEE
  // =====================================================

  if (!employee) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4">

        <div className="text-center">

          <h2 className="text-lg font-semibold text-gray-900">
            Employee record not found
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            No employee record is linked to your account.
            Please contact your administrator.
          </p>

        </div>

      </div>
    );
  }

  // =====================================================
  // CARDS
  // =====================================================

  const statCards = [
    {
      icon: Clock,
      label:
        "Today's Status",

      value:
        checkedInToday
          ? "Checked In"
          : "Not Checked In",

      sub:
        checkedInToday
          ? `Since ${checkInTime}`
          : "Go to Attendance to check in",

      iconBg:
        "bg-blue-50",

      iconColor:
        "text-blue-600",
    },

    {
      icon:
        CalendarCheck,

      label:
        "This Month's Attendance",

      value:
        `${attendancePct}%`,

      sub:
        `${present} / ${totalDays} days present`,

      iconBg:
        "bg-green-50",

      iconColor:
        "text-green-600",
    },

    {
      icon: Boxes,

      label:
        "My Assets",

      value:
        String(
          assetCount
        ),

      sub:
        "Currently assigned to you",

      iconBg:
        "bg-amber-50",

      iconColor:
        "text-amber-600",
    },

    {
      icon: Users,

      label:
        "My Team",

      value:
        String(
          teamSize
        ),

      sub:
        "Employees in your department",

      iconBg:
        "bg-purple-50",

      iconColor:
        "text-purple-600",
    },
  ];

  return (
    <div className="w-full">

      <main className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* =================================================
            WELCOME
        ================================================= */}

        <div className="mb-7">

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">

            Welcome back,{" "}

            <span className="capitalize">
              {
                employee
                  .full_name
                  .split(" ")[0]
              }
            </span>

          </h1>

          <p className="text-sm sm:text-base text-gray-500 mt-1">

            {
              employee.designation
            }

            <span className="mx-2">
              ·
            </span>

            {
              employee.department
            }

          </p>

        </div>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

          {statCards.map(
            (card) => {
              const Icon =
                card.icon;

              return (
                <div
                  key={
                    card.label
                  }
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition"
                >

                  <div className="flex items-center gap-3 mb-5">

                    <div
                      className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center`}
                    >

                      <Icon
                        size={
                          18
                        }
                      />

                    </div>

                    <span className="text-sm font-medium text-gray-600">
                      {
                        card.label
                      }
                    </span>

                  </div>

                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {
                      card.value
                    }
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    {
                      card.sub
                    }
                  </p>

                </div>
              );
            }
          )}

        </div>

        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ATTENDANCE */}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/employee/attendance"
              )
            }
            className="group bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-[#034EA2] hover:shadow-sm transition-all text-left"
          >

            <div className="flex items-center gap-4">

              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#034EA2] flex items-center justify-center shrink-0">

                <Clock
                  size={20}
                />

              </div>

              <div>

                <p className="text-base font-semibold text-gray-900">
                  Go to Attendance
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Check in/out and view your history
                </p>

              </div>

            </div>

            <ArrowUpRight
              size={20}
              className="text-gray-400 group-hover:text-[#034EA2] transition-colors"
            />

          </button>

          {/* ASSETS */}

          <button
            type="button"
            onClick={() =>
              router.push(
                "/employee/assets"
              )
            }
            className="group bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-between hover:border-[#034EA2] hover:shadow-sm transition-all text-left"
          >

            <div className="flex items-center gap-4">

              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">

                <Boxes
                  size={20}
                />

              </div>

              <div>

                <p className="text-base font-semibold text-gray-900">
                  View My Assets
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Equipment currently assigned to you
                </p>

              </div>

            </div>

            <ArrowUpRight
              size={20}
              className="text-gray-400 group-hover:text-[#034EA2] transition-colors"
            />

          </button>

        </div>

      </main>

    </div>
  );
}