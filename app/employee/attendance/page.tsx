"use client";

import { useEffect, useState } from "react";
import { Clock, LogIn, LogOut, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type HistoryRow = {
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
};

export default function MyAttendancePage() {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const todayISO = new Date().toISOString().split("T")[0];

  const fetchData = async (empId: string) => {
    const { data: todayRec } = await supabase
      .from("attendance")
      .select("check_in")
      .eq("employee_id", empId)
      .eq("date", todayISO)
      .maybeSingle();

    if (todayRec?.check_in) {
      setCheckedIn(true);
      setCheckInTime(todayRec.check_in);
    } else {
      setCheckedIn(false);
      setCheckInTime(null);
    }

    const { data: recentRecs } = await supabase
      .from("attendance")
      .select("date, check_in, check_out, status")
      .eq("employee_id", empId)
      .order("date", { ascending: false })
      .limit(10);

    setHistory(
      (recentRecs || []).map((r) => ({
        date: new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        checkIn: r.check_in || "—",
        checkOut: r.check_out || "—",
        status: r.status || "Absent",
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("employee_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.employee_id) { setLoading(false); return; }
      setEmployeeId(profile.employee_id);
      fetchData(profile.employee_id);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckIn = async () => {
    if (!employeeId) return;
    const time = new Date().toTimeString().slice(0, 5);

    const { error } = await supabase.from("attendance").upsert(
      [{
        employee_id: employeeId,
        date: todayISO,
        check_in: time,
        status: "Present",
      }],
      { onConflict: "employee_id,date" }
    );

    if (error) { alert(error.message); return; }
    fetchData(employeeId);
  };

  const handleCheckOut = async () => {
    if (!employeeId) return;
    const time = new Date().toTimeString().slice(0, 5);

    const { error } = await supabase
      .from("attendance")
      .update({ check_out: time })
      .eq("employee_id", employeeId)
      .eq("date", todayISO);

    if (error) { alert(error.message); return; }
    fetchData(employeeId);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading your attendance...</div>;
  }

  return (
    <div className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">My Attendance</h1>
        <p className="text-sm text-gray-600 mt-1">Check in, check out, and review your attendance history.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#EAF2FC] text-[#034EA2] flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-black">
              {checkedIn ? `Checked in at ${checkInTime}` : "You haven't checked in today"}
            </p>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        {checkedIn ? (
          <button
            onClick={handleCheckOut}
            className="flex items-center justify-center gap-2 bg-[#231F20] hover:bg-black text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <LogOut size={15} />
            Check Out
          </button>
        ) : (
          <button
            onClick={handleCheckIn}
            className="flex items-center justify-center gap-2 bg-[#034EA2] hover:bg-[#023d82] text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <LogIn size={15} />
            Check In
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-black">Recent History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Check In</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Check Out</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No attendance records yet.</td></tr>
              )}
              {history.map((h, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-5 py-3.5 font-medium text-black whitespace-nowrap">{h.date}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{h.checkIn}</td>
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{h.checkOut}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                        h.status === "Present" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {h.status === "Present" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}