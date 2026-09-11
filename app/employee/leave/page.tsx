"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plane,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  Send,
  FileText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  designation?: string;
  department?: string;
};

type LeaveType = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  totalDays: number;
  period: "Yearly" | "Monthly";
};

type LeaveRequest = {
  id: string;
  employeeId: string;
  type: string;
  date: string;
  days: number;
  reason: string;
  approvedBy: string | null;
  status: "pending" | "approved" | "rejected";
};

type Holiday = {
  id: string;
  name: string;
  date: string;
  type?: string;
  recurring?: boolean;
  active?: boolean;
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function EmployeeLeavePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    type: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  // ============================================================
  // FETCH EMPLOYEE
  // ============================================================

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = "/login";
          return;
        }

        // --------------------------------------------------------
        // Get employee ID from profile
        // --------------------------------------------------------

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("employee_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Profile error:", profileError);
          return;
        }

        if (!profile?.employee_id) {
          console.error("No employee linked to this account.");
          return;
        }

        // --------------------------------------------------------
        // Get employee
        // --------------------------------------------------------

        const { data: emp, error: employeeError } = await supabase
          .from("employees")
          .select("id, full_name, designation, department")
          .eq("id", profile.employee_id)
          .maybeSingle();

        if (employeeError) {
          console.error("Employee error:", employeeError);
          return;
        }

        if (!emp) {
          console.error("Employee not found.");
          return;
        }

        setEmployee(emp);

        // --------------------------------------------------------
        // Get leave types
        // --------------------------------------------------------

        const { data: typeData, error: typeError } = await supabase
          .from("leave_types")
          .select("*")
          .order("name");

        if (typeError) {
          console.error("Leave types error:", typeError);
        }

        setLeaveTypes(
          (typeData || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            code: row.code,
            description: row.description,
            totalDays: Number(row.total_days || 0),
            period: row.period || "Yearly",
          }))
        );

        // --------------------------------------------------------
        // Get employee leave requests
        // --------------------------------------------------------

        await fetchLeaveRequests(profile.employee_id);

        // --------------------------------------------------------
        // Get holidays
        // --------------------------------------------------------

        const { data: holidayData, error: holidayError } = await supabase
          .from("holidays")
          .select("*")
          .eq("active", true)
          .order("date");

        if (holidayError) {
          console.error("Holiday error:", holidayError);
        }

        setHolidays(holidayData || []);

        // --------------------------------------------------------
        // Get weekly off days
        // --------------------------------------------------------

        const { data: settingsData, error: settingsError } =
          await supabase
            .from("settings")
            .select("value")
            .eq("key", "weekly_off_days")
            .maybeSingle();

        if (settingsError) {
          console.error("Settings error:", settingsError);
        }

        setWeeklyOffDays(settingsData?.value?.days || []);
      } catch (error) {
        console.error("Employee leave page error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  // ============================================================
  // FETCH LEAVE REQUESTS
  // ============================================================

  const fetchLeaveRequests = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false });

    if (error) {
      console.error("Leave requests error:", error);
      return;
    }

    setLeaveRequests(
      (data || []).map((row: any) => ({
        id: row.id,
        employeeId: row.employee_id,
        type: row.type,
        date: row.date,
        days: Number(row.days || 0),
        reason: row.reason || "",
        approvedBy: row.approved_by || null,
        status: row.status || "pending",
      }))
    );
  };

  // ============================================================
  // REALTIME REFRESH
  // ============================================================

  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel(`employee-leave-${employee.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
          filter: `employee_id=eq.${employee.id}`,
        },
        () => {
          fetchLeaveRequests(employee.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id]);

  // ============================================================
  // CALCULATE WORKING DAYS
  // ============================================================

  const calculateLeaveDays = (
    fromDate: string,
    toDate: string
  ): number => {
    if (!fromDate || !toDate) return 0;

    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);

    if (end < start) return 0;

    let count = 0;

    const current = new Date(start);

    while (current <= end) {
      const dateString = current.toISOString().split("T")[0];

      const dayName = current.toLocaleDateString("en-US", {
        weekday: "long",
      });

      const isWeeklyOff = weeklyOffDays.includes(dayName);

      const isHoliday = holidays.some(
        (holiday) => holiday.date === dateString
      );

      if (!isWeeklyOff && !isHoliday) {
        count++;
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  // ============================================================
  // SELECTED DAYS
  // ============================================================

  const requestedDays = useMemo(() => {
    return calculateLeaveDays(form.fromDate, form.toDate);
  }, [
    form.fromDate,
    form.toDate,
    weeklyOffDays,
    holidays,
  ]);

  // ============================================================
  // LEAVE STATISTICS
  // ============================================================

  const stats = useMemo(() => {
    const total = leaveRequests.length;

    const pending = leaveRequests.filter(
      (request) => request.status === "pending"
    ).length;

    const approved = leaveRequests.filter(
      (request) => request.status === "approved"
    ).length;

    const rejected = leaveRequests.filter(
      (request) => request.status === "rejected"
    ).length;

    const approvedDays = leaveRequests
      .filter((request) => request.status === "approved")
      .reduce((sum, request) => sum + request.days, 0);

    return {
      total,
      pending,
      approved,
      rejected,
      approvedDays,
    };
  }, [leaveRequests]);

  // ============================================================
  // LEAVE BALANCE
  // ============================================================

  const getLeaveBalance = (leaveType: LeaveType) => {
    const used = leaveRequests
      .filter(
        (request) =>
          request.type === leaveType.name &&
          request.status === "approved"
      )
      .reduce((sum, request) => sum + request.days, 0);

    const total = leaveType.totalDays;

    return {
      total,
      used,
      remaining: Math.max(total - used, 0),
    };
  };

  // ============================================================
  // SUBMIT LEAVE REQUEST
  // ============================================================
   const handleSubmitRequest = async () => {
  if (!employee) {
    alert("Employee information is not available.");
    return;
  }

  if (!form.type) {
    alert("Please select a leave type.");
    return;
  }

  if (!form.fromDate || !form.toDate) {
    alert("Please select the leave dates.");
    return;
  }

  if (new Date(form.toDate) < new Date(form.fromDate)) {
    alert("To date cannot be before From date.");
    return;
  }

  if (requestedDays <= 0) {
    alert(
      "The selected dates contain no working days. Please select different dates."
    );
    return;
  }

  const selectedType = leaveTypes.find(
    (type) => type.name === form.type
  );

  if (!selectedType) {
    alert("Invalid leave type selected.");
    return;
  }

  const balance = getLeaveBalance(selectedType);

  if (requestedDays > balance.remaining) {
    alert(
      `You only have ${balance.remaining} ${selectedType.name} day(s) remaining.`
    );
    return;
  }

  setSubmitting(true);

  try {
    // --------------------------------------------------------
    // Confirm logged-in user
    // --------------------------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User error:", userError);

      alert(
        "Your login session has expired. Please login again."
      );

      window.location.href = "/login";
      return;
    }

    // --------------------------------------------------------
    // Insert leave request
    // --------------------------------------------------------

    const {
      data: insertedRequest,
      error: insertError,
    } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: employee.id,
        type: selectedType.name,
        date: form.fromDate,
        days: requestedDays,
        reason: form.reason.trim(),
        approved_by: null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "Submit leave request error:",
        insertError
      );

      alert(
        `Unable to submit leave request: ${insertError.message}`
      );

      return;
    }

    if (!insertedRequest) {
      alert(
        "Leave request could not be created."
      );
      return;
    }

    console.log(
      "Leave request created:",
      insertedRequest
    );

    alert(
      "Leave request submitted successfully. Waiting for HR approval."
    );

    setForm({
      type: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });

    setShowRequestModal(false);

    await fetchLeaveRequests(employee.id);
  } catch (error) {
    console.error(
      "Unexpected leave request error:",
      error
    );

    alert(
      "Something went wrong while submitting your leave request."
    );
  } finally {
    setSubmitting(false);
  }
};

  // ============================================================
  // CANCEL REQUEST
  // ============================================================

  const handleCancelRequest = async (request: LeaveRequest) => {
    if (request.status !== "pending") return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this leave request?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", request.id)
      .eq("employee_id", employee?.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (employee) {
      await fetchLeaveRequests(employee.id);
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (date: string) => {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-gray-500">
          Loading leave information...
        </p>
      </div>
    );
  }

  // ============================================================
  // NO EMPLOYEE
  // ============================================================

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] px-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md">
          <AlertCircle
            size={40}
            className="mx-auto text-red-500 mb-4"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Employee account not linked
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Your account is not linked to an employee record.
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="min-h-screen w-full bg-[#F7F9FC]">

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-[96px] pb-10">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-7">

          <div>
            <div className="flex items-center gap-2">

              <Plane
                size={22}
                className="text-[#034EA2] -rotate-45"
              />

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Leave
              </h1>

            </div>

            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Apply for leave and track your leave requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="flex items-center justify-center gap-2 bg-[#034EA2] hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={17} />
            Request Leave
          </button>

        </div>

        {/* ==================================================
            STAT CARDS
        ================================================== */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">

          {/* Total */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#034EA2] flex items-center justify-center">
                <FileText size={18} />
              </div>

              <span className="text-xs text-gray-400">
                Requests
              </span>

            </div>

            <p className="text-2xl font-bold text-gray-900 mt-4">
              {stats.total}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Total requests
            </p>

          </div>

          {/* Pending */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <Clock size={18} />
              </div>

              <span className="text-xs text-yellow-600">
                Pending
              </span>

            </div>

            <p className="text-2xl font-bold text-gray-900 mt-4">
              {stats.pending}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Awaiting approval
            </p>

          </div>

          {/* Approved */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>

              <span className="text-xs text-green-600">
                Approved
              </span>

            </div>

            <p className="text-2xl font-bold text-gray-900 mt-4">
              {stats.approvedDays}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Approved days
            </p>

          </div>

          {/* Rejected */}

          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <XCircle size={18} />
              </div>

              <span className="text-xs text-red-600">
                Rejected
              </span>

            </div>

            <p className="text-2xl font-bold text-gray-900 mt-4">
              {stats.rejected}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Rejected requests
            </p>

          </div>

        </div>

        {/* ==================================================
            LEAVE BALANCES
        ================================================== */}

        <section className="mb-7">

          <div className="flex items-center justify-between mb-3">

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Leave Balance
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Your available leave for the configured period.
              </p>
            </div>

          </div>

          {leaveTypes.length === 0 ? (

            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-gray-400">
                No leave types have been configured yet.
              </p>
            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {leaveTypes.map((leaveType) => {

                const balance = getLeaveBalance(leaveType);

                const percentage =
                  balance.total > 0
                    ? Math.min(
                        (balance.used / balance.total) * 100,
                        100
                      )
                    : 0;

                return (
                  <div
                    key={leaveType.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h3 className="text-sm font-semibold text-gray-900 capitalize">
                          {leaveType.name}
                        </h3>

                        {leaveType.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {leaveType.description}
                          </p>
                        )}

                      </div>

                      {leaveType.code && (
                        <span className="text-[10px] font-semibold uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          {leaveType.code}
                        </span>
                      )}

                    </div>

                    <div className="flex items-end gap-1 mt-5">

                      <span className="text-3xl font-bold text-gray-900">
                        {balance.remaining}
                      </span>

                      <span className="text-xs text-gray-400 mb-1">
                        / {balance.total} days
                      </span>

                    </div>

                    <div className="w-full h-2 bg-gray-100 rounded-full mt-4 overflow-hidden">

                      <div
                        className="h-full bg-[#034EA2] rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />

                    </div>

                    <div className="flex justify-between mt-2 text-xs">

                      <span className="text-gray-400">
                        Used: {balance.used}
                      </span>

                      <span className="text-gray-400">
                        {leaveType.period === "Monthly"
                          ? "Monthly"
                          : "Yearly"}
                      </span>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        {/* ==================================================
            LEAVE REQUEST HISTORY
        ================================================== */}

        <section>

          <div className="flex items-center justify-between mb-3">

            <div>

              <h2 className="text-lg font-semibold text-gray-900">
                My Leave Requests
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                View the status of your submitted leave requests.
              </p>

            </div>

          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="border-b border-gray-100 bg-gray-50/70">

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Leave Type
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Date
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Days
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Reason
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Approved By
                    </th>

                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {leaveRequests.length === 0 ? (

                    <tr>

                      <td
                        colSpan={7}
                        className="px-5 py-16 text-center"
                      >

                        <Plane
                          size={28}
                          className="mx-auto text-gray-300 -rotate-45"
                        />

                        <p className="text-sm text-gray-400 mt-3">
                          You haven't submitted any leave requests yet.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setShowRequestModal(true)
                          }
                          className="text-sm text-[#034EA2] font-medium mt-2 hover:underline"
                        >
                          Request your first leave
                        </button>

                      </td>

                    </tr>

                  ) : (

                    leaveRequests.map((request) => (

                      <tr
                        key={request.id}
                        className="border-t border-gray-50 hover:bg-gray-50/50"
                      >

                        <td className="px-5 py-4 font-medium text-gray-900 whitespace-nowrap capitalize">
                          {request.type}
                        </td>

                        <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                          {formatDate(request.date)}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {request.days}
                        </td>

                        <td className="px-5 py-4 text-gray-500 max-w-[220px] truncate">
                          {request.reason || "—"}
                        </td>

                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {request.approvedBy || "—"}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                              request.status === "approved"
                                ? "bg-green-50 text-green-700"
                                : request.status === "rejected"
                                ? "bg-red-50 text-red-600"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >

                            {request.status === "approved" && (
                              <CheckCircle2 size={12} />
                            )}

                            {request.status === "rejected" && (
                              <XCircle size={12} />
                            )}

                            {request.status === "pending" && (
                              <Clock size={12} />
                            )}

                            {request.status
                              .charAt(0)
                              .toUpperCase() +
                              request.status.slice(1)}

                          </span>

                        </td>

                        <td className="px-5 py-4">

                          {request.status === "pending" ? (

                            <button
                              type="button"
                              onClick={() =>
                                handleCancelRequest(request)
                              }
                              className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Cancel
                            </button>

                          ) : (

                            <span className="text-xs text-gray-300 block text-right">
                              —
                            </span>

                          )}

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      </main>

      {/* ======================================================
          REQUEST LEAVE MODAL
      ====================================================== */}

      {showRequestModal && (

        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">

              <div>

                <h2 className="text-lg font-semibold text-gray-900">
                  Request Leave
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Submit a leave request to HR.
                </p>

              </div>

              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X size={19} />
              </button>

            </div>

            {/* Modal Body */}

            <div className="p-6 space-y-5">

              {/* Employee */}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">

                <p className="text-xs text-blue-500 font-medium">
                  Employee
                </p>

                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {employee.full_name}
                </p>

                <p className="text-xs text-gray-500 mt-0.5">
                  {employee.designation || "Employee"}
                  {employee.department
                    ? ` · ${employee.department}`
                    : ""}
                </p>

              </div>

              {/* Leave Type */}

              <div>

                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Leave Type *
                </label>

                <div className="relative">

                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value,
                      })
                    }
                    className="appearance-none w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >

                    <option value="">
                      Select leave type
                    </option>

                    {leaveTypes.map((type) => {

                      const balance =
                        getLeaveBalance(type);

                      return (
                        <option
                          key={type.id}
                          value={type.name}
                        >
                          {type.name} — {balance.remaining} day(s) remaining
                        </option>
                      );
                    })}

                  </select>

                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />

                </div>

              </div>

              {/* Dates */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    From Date *
                  </label>

                  <input
                    type="date"
                    value={form.fromDate}
                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fromDate: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    To Date *
                  </label>

                  <input
                    type="date"
                    value={form.toDate}
                    min={
                      form.fromDate ||
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        toDate: e.target.value,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

              </div>

              {/* Number of Days */}

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <CalendarDays
                      size={17}
                      className="text-[#034EA2]"
                    />

                    <span className="text-sm font-medium text-gray-700">
                      Leave Days
                    </span>

                  </div>

                  <span className="text-lg font-bold text-[#034EA2]">
                    {requestedDays}
                  </span>

                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Weekends configured as weekly off and active
                  company holidays are automatically excluded.
                </p>

              </div>

              {/* Reason */}

              <div>

                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Reason
                </label>

                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reason: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Enter the reason for your leave..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

              </div>

              {/* Warning */}

              {form.type && requestedDays > 0 && (

                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl p-3">

                  <AlertCircle
                    size={16}
                    className="text-yellow-600 mt-0.5 shrink-0"
                  />

                  <p className="text-xs text-yellow-700">

                    Your request for{" "}
                    <strong>
                      {requestedDays} day
                      {requestedDays !== 1
                        ? "s"
                        : ""}
                    </strong>{" "}
                    of{" "}
                    <strong className="capitalize">
                      {form.type}
                    </strong>{" "}
                    will be sent to HR for approval.

                  </p>

                </div>

              )}

            </div>

            {/* Modal Footer */}

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">

              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#034EA2] hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >

                <Send size={15} />

                {submitting
                  ? "Submitting..."
                  : "Submit Request"}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}