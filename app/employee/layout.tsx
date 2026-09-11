"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import NotificationBell from "@/components/NotificationBell";

import {
  LayoutDashboard,
  Clock,
  Boxes,
  Users,
  CalendarCheck,
  CalendarDays,
  FileText,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
};

type MenuItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const isChangePasswordPage =
    pathname === "/employee/change-password";

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // MENU ITEMS
  // =====================================================

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      path: "/employee/dashboard",
      icon: <LayoutDashboard size={19} />,
    },
    {
      label: "Attendance",
      path: "/employee/attendance",
      icon: <Clock size={19} />,
    },
    {
      label: "Leave",
      path: "/employee/leave",
      icon: <CalendarCheck size={19} />,
    },
    {
      label: "Assets",
      path: "/employee/assets",
      icon: <Boxes size={19} />,
    },
    {
      label: "Teams",
      path: "/employee/teams",
      icon: <Users size={19} />,
    },
    {
      label: "Payslips",
      path: "/employee/payslips",
      icon: <FileText size={19} />,
    },
    {
      label: "Holidays",
      path: "/employee/holidays",
      icon: <CalendarDays size={19} />,
    },
    {
      label: "Profile",
      path: "/employee/profile",
      icon: <UserCircle size={19} />,
    },
    {
      label: "Settings",
      path: "/employee/settings",
      icon: <Settings size={19} />,
    },
  ];

  // =====================================================
  // LOAD LOGGED-IN EMPLOYEE
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadEmployee = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
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
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Employee layout profile error:",
            profileError
          );
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // =================================================
        // EMPLOYEE ONLY ACCESS
        // =================================================

        if (profile.role !== "employee") {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // =================================================
        // FORCE PASSWORD CHANGE
        // =================================================

        if (
          profile.must_change_password === true &&
          pathname !== "/employee/change-password"
        ) {
          router.replace(
            "/employee/change-password"
          );
          return;
        }

        if (!profile.employee_id) {
          console.error(
            "No employee linked to this profile."
          );

          await supabase.auth.signOut();

          router.replace("/login");
          return;
        }

        // =================================================
        // LOAD EMPLOYEE
        // =================================================

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(
            "id, full_name, designation, department"
          )
          .eq("id", profile.employee_id)
          .maybeSingle();

        if (employeeError) {
          console.error(
            "Employee fetch error:",
            employeeError
          );
          return;
        }

        if (!employeeData) {
          console.error(
            "Employee record not found."
          );
          return;
        }

        if (mounted) {
          setEmployee(employeeData);
        }
      } catch (error) {
        console.error(
          "Employee layout error:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEmployee();

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

  // =====================================================
  // CLOSE MENU WHEN ROUTE CHANGES
  // =====================================================

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    setMenuOpen(false);

    await supabase.auth.signOut();

    router.replace("/login");
  };

  // =====================================================
  // NAVIGATION
  // =====================================================

  const navigateTo = (
    path: string
  ) => {
    setMenuOpen(false);

    router.push(path);
  };

  // =====================================================
  // ACTIVE MENU
  // =====================================================

  const isActive = (
    path: string
  ) => {
    if (
      path === "/employee/dashboard"
    ) {
      return (
        pathname ===
        "/employee/dashboard"
      );
    }

    return pathname.startsWith(path);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading employee portal...
        </p>
      </div>
    );
  }

  // =====================================================
  // CHANGE PASSWORD PAGE
  // NO HEADER / NO SIDEBAR
  // =====================================================

  if (isChangePasswordPage) {
    return <>{children}</>;
  }

  // =====================================================
  // NORMAL EMPLOYEE LAYOUT
  // =====================================================

  return (
    <div className="min-h-screen bg-[#F7F9FC]">

      {/* =================================================
          FIXED HEADER
      ================================================= */}

      <header className="fixed top-0 left-0 right-0 z-50 h-[72px] bg-white border-b border-gray-200">

        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* =================================================
              LEFT SIDE
          ================================================= */}

          <div className="flex items-center gap-3">

            {/* MENU BUTTON */}

            <button
              type="button"
              onClick={() =>
                setMenuOpen(true)
              }
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 transition"
              title="Menu"
            >
              <Menu size={23} />
            </button>

            {/* LOGO */}

            <Image
              src="/logo.png"
              alt="SIGMANIX TECH"
              width={180}
              height={55}
              priority
              loading="eager"
              className="w-[130px] sm:w-[150px] lg:w-[160px] h-auto object-contain"
            />

          </div>

          {/* =================================================
              RIGHT SIDE
          ================================================= */}

          <div className="flex items-center gap-1 sm:gap-2">

            {/* =================================================
                REALTIME NOTIFICATION BELL
            ================================================= */}

            <NotificationBell />

            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="hidden sm:block h-8 w-px bg-gray-200 mx-1" />

            {/* =================================================
                USER PROFILE
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/employee/profile"
                )
              }
              className="flex items-center gap-2 rounded-lg px-1 sm:px-2 py-1 hover:bg-gray-50 transition"
            >

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 flex items-center justify-center">

                <UserCircle
                  size={23}
                  className="text-[#034EA2]"
                />

              </div>

              <div className="hidden lg:block text-left">

                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {employee?.full_name ||
                    "Employee"}
                </p>

                <p className="text-xs text-gray-500">
                  Employee
                </p>

              </div>

            </button>

            {/* =================================================
                LOGOUT
            ================================================= */}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={17} />

              <span className="hidden sm:inline text-sm font-medium">
                Logout
              </span>
            </button>

          </div>

        </div>

      </header>

      {/* =================================================
          MENU OVERLAY
      ================================================= */}

      <div
        onClick={() =>
          setMenuOpen(false)
        }
        className={`fixed inset-0 z-[55] bg-black/30 transition-opacity duration-300 ${
          menuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
      />

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`fixed top-0 left-0 z-[60] h-screen w-[280px] bg-white shadow-2xl transform transition-transform duration-300 ${
          menuOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* =================================================
            SIDEBAR HEADER
        ================================================= */}

        <div className="h-[72px] border-b border-gray-200 flex items-center justify-between px-5">

          <Image
            src="/logo.png"
            alt="SIGMANIX TECH"
            width={160}
            height={50}
            priority
            className="w-[140px] h-auto object-contain"
          />

          <button
            type="button"
            onClick={() =>
              setMenuOpen(false)
            }
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            <X size={22} />
          </button>

        </div>

        {/* =================================================
            MENU ITEMS
        ================================================= */}

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-145px)]">

          {menuItems.map(
            (item) => {
              const active =
                isActive(
                  item.path
                );

              return (
                <button
                  type="button"
                  key={item.path}
                  onClick={() =>
                    navigateTo(
                      item.path
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    active
                      ? "bg-blue-50 text-[#034EA2]"
                      : "text-gray-700 hover:bg-blue-50 hover:text-[#034EA2]"
                  }`}
                >
                  {item.icon}

                  <span>
                    {item.label}
                  </span>

                </button>
              );
            }
          )}

        </nav>

        {/* =================================================
            SIDEBAR LOGOUT
        ================================================= */}

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 font-medium text-sm hover:bg-red-50"
          >
            <LogOut size={19} />

            Logout
          </button>

        </div>

      </aside>

      {/* =================================================
          HEADER SPACER
      ================================================= */}

      <div
        aria-hidden="true"
        className="h-[72px] w-full"
      />

      {/* =================================================
          PAGE CONTENT
      ================================================= */}

      <main className="min-h-[calc(100vh-72px)] bg-[#F7F9FC]">
        {children}
      </main>

    </div>
  );
}