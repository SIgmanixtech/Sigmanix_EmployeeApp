"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import {
  LayoutDashboard,
  Clock,
  Boxes,
  Users,
  CalendarCheck,
  CalendarDays,
  FileText,
  UserCircle,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  CheckCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
};

type Notification = {
  id: string;
  employee_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
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

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

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
    const loadEmployee = async () => {
      try {
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

        if (profile.role !== "employee") {
          router.replace("/dashboard");
          return;
        }

        if (
  profile.must_change_password === true &&
  pathname !== "/employee/change-password"
) {
  router.replace("/employee/change-password");
  return;
}

        if (!profile.employee_id) {
          console.error(
            "No employee linked to this profile."
          );
          return;
        }

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

        setEmployee(employeeData);
      } catch (error) {
        console.error(
          "Employee layout error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [router, pathname]);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const fetchNotifications = async (
    employeeId: string
  ) => {
    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .select(
        `
        id,
        employee_id,
        title,
        message,
        type,
        link,
        is_read,
        created_at
        `
      )
      .eq("employee_id", employeeId)
      .order("created_at", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error(
        "Notification fetch error:",
        error
      );
      return;
    }

    setNotifications(data || []);
  };

  // =====================================================
  // LOAD + REALTIME NOTIFICATIONS
  // =====================================================

  useEffect(() => {
    if (!employee?.id) return;

    fetchNotifications(employee.id);

    const channel = supabase
      .channel(
        `employee-notifications-${employee.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchNotifications(employee.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  // =====================================================
  // CLOSE MENU WHEN ROUTE CHANGES
  // =====================================================

  useEffect(() => {
    setMenuOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (item) => !item.is_read
    ).length;
  }, [notifications]);

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    if (!notification.is_read) {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notification.id);

      if (error) {
        console.error(
          "Mark notification read error:",
          error
        );
      }
    }

    setNotificationOpen(false);

    if (notification.link) {
      router.push(notification.link);
    } else {
      await fetchNotifications(
        notification.employee_id
      );
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead = async () => {
    if (!employee?.id) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("employee_id", employee.id)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Mark all read error:",
        error
      );
      return;
    }

    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        is_read: true,
      }))
    );
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    setMenuOpen(false);
    setNotificationOpen(false);

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
  // DATE
  // =====================================================

  const formatNotificationTime = (
    value: string
  ) => {
    const date = new Date(value);

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // LOADING
  // =====================================================
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

          {/* LEFT */}

          <div className="flex items-center gap-3">

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

          {/* RIGHT */}

          <div className="flex items-center gap-1 sm:gap-2">

            {/* =================================================
                BELL
            ================================================= */}

            <div className="relative">
{/* 
              <button
                type="button"
                onClick={() =>
                  setNotificationOpen(
                    (prev) => !prev
                  )
                }
                title="Notifications"
                className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
              >

                <Bell
                  size={19}
                  className="text-gray-600"
                />

                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}

              </button> */}

              {/* =================================================
                  NOTIFICATION DROPDOWN
              ================================================= */}

              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-24px)] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-[70]">

                  {/* HEADER */}

                  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">

                    <div>

                      <h3 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h3>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {unreadCount} unread
                      </p>

                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        <CheckCheck
                          size={15}
                        />

                        Mark all read
                      </button>
                    )}

                  </div>

                  {/* LIST */}

                  <div className="max-h-[420px] overflow-y-auto">

                    {notifications.length === 0 ? (

                      <div className="px-5 py-10 text-center">

                        <Bell
                          size={26}
                          className="mx-auto text-gray-300"
                        />

                        <p className="text-sm font-medium text-gray-700 mt-3">
                          No notifications
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          New HRMS updates will appear here.
                        </p>

                      </div>

                    ) : (

                      notifications.map(
                        (notification) => (
                          <button
                            type="button"
                            key={
                              notification.id
                            }
                            onClick={() =>
                              handleNotificationClick(
                                notification
                              )
                            }
                            className={`w-full text-left px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition ${
                              !notification.is_read
                                ? "bg-blue-50/40"
                                : "bg-white"
                            }`}
                          >

                            <div className="flex gap-3">

                              <div className="pt-1">

                                <span
                                  className={`block w-2.5 h-2.5 rounded-full ${
                                    !notification.is_read
                                      ? "bg-blue-600"
                                      : "bg-gray-300"
                                  }`}
                                />

                              </div>

                              <div className="min-w-0 flex-1">

                                <div className="flex items-start justify-between gap-3">

                                  <p
                                    className={`text-sm ${
                                      !notification.is_read
                                        ? "font-semibold text-gray-900"
                                        : "font-medium text-gray-700"
                                    }`}
                                  >
                                    {
                                      notification.title
                                    }
                                  </p>

                                  <span className="text-[10px] text-gray-400 shrink-0">
                                    {formatNotificationTime(
                                      notification.created_at
                                    )}
                                  </span>

                                </div>

                                <p className="text-xs text-gray-500 mt-1 leading-5">
                                  {
                                    notification.message
                                  }
                                </p>

                              </div>

                            </div>

                          </button>
                        )
                      )

                    )}

                  </div>

                </div>
              )}

            </div>

            {/* SETTINGS */}

            {/* <button
              type="button"
              onClick={() =>
                router.push(
                  "/employee/settings"
                )
              }
              title="Settings"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
            >
              <Settings
                size={19}
                className="text-gray-600"
              />
            </button> */}

            <div className="hidden sm:block h-8 w-px bg-gray-200 mx-1" />

            {/* USER */}

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

            {/* LOGOUT */}

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
                  <span>{item.label}</span>
                </button>
              );
            }
          )}

        </nav>

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