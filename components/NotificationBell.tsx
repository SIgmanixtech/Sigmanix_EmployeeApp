"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  CircleCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  employee_id: string | null;
  recipient_user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
};

export default function NotificationBell() {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>(
    []
  );

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // ============================================================
  // UNREAD COUNT
  // ============================================================

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  // ============================================================
  // FETCH NOTIFICATIONS
  // ============================================================

  const fetchNotifications = async (recipientUserId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
          id,
          employee_id,
          recipient_user_id,
          title,
          message,
          type,
          link,
          is_read,
          created_at,
          entity_type,
          entity_id
        `
      )
      .eq("recipient_user_id", recipientUserId)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.error("Notification fetch error:", error);
      return;
    }

    setNotifications((data || []) as Notification[]);
  };

  // ============================================================
  // GET LOGGED-IN USER
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const initializeNotifications = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          console.error("Notification user error:", error);
          return;
        }

        if (!user || !mounted) {
          return;
        }

        setUserId(user.id);

        await fetchNotifications(user.id);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // REALTIME NOTIFICATIONS
  // ============================================================

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications(userId);
        }
      )
      .subscribe((status) => {
        console.log("Notification realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ============================================================
  // CLOSE WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ============================================================
  // MARK ONE AS READ
  // ============================================================

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("recipient_user_id", userId);

    if (error) {
      console.error("Mark notification read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );
  };

  // ============================================================
  // MARK ALL AS READ
  // ============================================================

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("recipient_user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Mark all read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  };

  // ============================================================
  // CLICK NOTIFICATION
  // ============================================================

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    setOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatNotificationTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();

    const difference = now.getTime() - created.getTime();

    const seconds = Math.floor(difference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    if (hours < 24) {
      return `${hours}h ago`;
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return created.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      ref={dropdownRef}
      className="relative"
    >
      {/* ======================================================
          BELL BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl text-gray-600 hover:text-[#034EA2] hover:bg-blue-50 transition"
        aria-label="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ======================================================
          DROPDOWN
      ====================================================== */}

      {open && (
        <div className="fixed sm:absolute top-[72px] sm:top-full right-3 sm:right-0 sm:mt-3 w-[calc(100vw-24px)] sm:w-[390px] max-h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-[200]">

          {/* HEADER */}

          <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-gray-100">

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Notifications
              </h3>

              <p className="text-xs text-gray-400 mt-0.5">
                {unreadCount === 0
                  ? "You're all caught up"
                  : `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            <div className="flex items-center gap-1">

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#034EA2] hover:bg-blue-50 transition"
                >
                  <CheckCheck size={15} />

                  <span className="hidden sm:inline">
                    Mark all read
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={17} />
              </button>

            </div>

          </div>

          {/* CONTENT */}

          <div className="max-h-[430px] overflow-y-auto">

            {loading ? (
              <div className="px-5 py-14 text-center">
                <div className="w-7 h-7 border-2 border-gray-200 border-t-[#034EA2] rounded-full animate-spin mx-auto" />

                <p className="text-sm text-gray-400 mt-3">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-14 text-center">

                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto">
                  <Bell
                    size={21}
                    className="text-gray-300"
                  />
                </div>

                <p className="text-sm font-medium text-gray-700 mt-3">
                  No notifications
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  New updates will appear here.
                </p>

              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                  className={`w-full text-left px-4 py-4 border-b border-gray-100 last:border-b-0 transition ${
                    notification.is_read
                      ? "bg-white hover:bg-gray-50"
                      : "bg-blue-50/60 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-start gap-3">

                    {/* ICON */}

                    <div
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                        notification.is_read
                          ? "bg-gray-100 text-gray-500"
                          : "bg-blue-100 text-[#034EA2]"
                      }`}
                    >
                      {notification.type ===
                      "leave_status" ? (
                        <CircleCheck size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </div>

                    {/* MESSAGE */}

                    <div className="flex-1 min-w-0">

                      <div className="flex items-start justify-between gap-2">

                        <p
                          className={`text-sm ${
                            notification.is_read
                              ? "font-medium text-gray-800"
                              : "font-semibold text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </p>

                        {!notification.is_read && (
                          <span className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-[#034EA2]" />
                        )}

                      </div>

                      <p className="text-xs text-gray-500 mt-1 leading-5">
                        {notification.message}
                      </p>

                      <p className="text-[11px] text-gray-400 mt-2">
                        {formatNotificationTime(
                          notification.created_at
                        )}
                      </p>

                    </div>

                  </div>
                </button>
              ))
            )}

          </div>

        </div>
      )}

    </div>
  );
}