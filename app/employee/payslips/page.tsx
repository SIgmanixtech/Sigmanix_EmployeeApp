"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  WalletCards,
  CalendarDays,
  IndianRupee,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  employee_id: string;
  designation: string;
  department: string;
};

type PayrollRun = {
  id: string;
  employee_id: string;
  month: string;
  basic: number | null;
  gross: number | null;
  pf: number | null;
  esi: number | null;
  pt: number | null;
  tds: number | null;
  lop: number | null;
  net_pay: number | null;
  status: string | null;
  approved_at: string | null;
};

export default function EmployeePayslipsPage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [payslips, setPayslips] =
    useState<PayrollRun[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  // =====================================================
  // FETCH EMPLOYEE + PAYSLIPS
  // =====================================================

  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        // ---------------------------------------------
        // 1. GET CURRENT USER
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
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        // ---------------------------------------------
        // 3. ROLE CHECK
        // ---------------------------------------------

        if (profile.role !== "employee") {
          router.replace("/dashboard");
          return;
        }

        // ---------------------------------------------
        // 4. PASSWORD CHANGE CHECK
        // ---------------------------------------------

        if (
          profile.must_change_password === true
        ) {
          router.replace("/change-password");
          return;
        }

        if (!profile.employee_id) {
          return;
        }

        const employeeDatabaseId =
          profile.employee_id;

        // ---------------------------------------------
        // 5. EMPLOYEE DETAILS
        // ---------------------------------------------

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(
            "id, full_name, employee_id, designation, department"
          )
          .eq(
            "id",
            employeeDatabaseId
          )
          .maybeSingle();

        if (employeeError) {
          console.error(
            "Employee error:",
            employeeError
          );
          return;
        }

        setEmployee(employeeData);

        // ---------------------------------------------
        // 6. PAYROLL RECORDS
        // ---------------------------------------------

        const {
          data: payrollData,
          error: payrollError,
        } = await supabase
          .from("payroll_runs")
          .select(
            `
            id,
            employee_id,
            month,
            basic,
            gross,
            pf,
            esi,
            pt,
            tds,
            lop,
            net_pay,
            status,
            approved_at
            `
          )
          .eq(
            "employee_id",
            employeeDatabaseId
          )
          .order(
            "month",
            {
              ascending: false,
            }
          );

        if (payrollError) {
          console.error(
            "Payslip fetch error:",
            payrollError
          );
          return;
        }

        setPayslips(
          payrollData || []
        );
      } catch (error) {
        console.error(
          "Payslip page error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [router]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredPayslips = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return payslips;
    }

    return payslips.filter(
      (item) =>
        `${item.month} ${item.status || ""}`
          .toLowerCase()
          .includes(value)
    );
  }, [
    payslips,
    search,
  ]);

  // =====================================================
  // TOTAL NET PAY
  // =====================================================

  const totalNetPay = useMemo(() => {
    return payslips.reduce(
      (sum, item) =>
        sum +
        Number(
          item.net_pay || 0
        ),
      0
    );
  }, [payslips]);

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatCurrency = (
    value: number | null
  ) => {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(value || 0)
    );
  };

  // =====================================================
  // DOWNLOAD PLACEHOLDER
  // =====================================================

  const handleDownload = (
    payslip: PayrollRun
  ) => {
    alert(
      `PDF download for ${payslip.month} will be connected next.`
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading payslips...
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
          </p>

        </div>

      </div>
    );
  }

  return (
    <main className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">

        <div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            My Payslips
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            View your salary history and payroll details
          </p>

        </div>

        <div className="text-sm text-gray-500">

          <span className="font-medium text-gray-700">
            {employee.full_name}
          </span>

          <span className="mx-2">
            ·
          </span>

          {employee.employee_id}

        </div>

      </div>

      {/* =================================================
          SUMMARY CARDS
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

        {/* TOTAL PAYSLIPS */}

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

              <FileText size={18} />

            </div>

            <p className="text-sm font-medium text-gray-600">
              Total Payslips
            </p>

          </div>

          <p className="text-3xl font-bold text-gray-900">
            {payslips.length}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Payroll records available
          </p>

        </div>

        {/* TOTAL NET */}

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">

              <IndianRupee size={18} />

            </div>

            <p className="text-sm font-medium text-gray-600">
              Total Net Pay
            </p>

          </div>

          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(
              totalNetPay
            )}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Across available payroll records
          </p>

        </div>

        {/* LATEST MONTH */}

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center gap-3 mb-4">

            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">

              <CalendarDays size={18} />

            </div>

            <p className="text-sm font-medium text-gray-600">
              Latest Payslip
            </p>

          </div>

          <p className="text-2xl font-bold text-gray-900">
            {
              payslips[0]?.month ||
              "Not Available"
            }
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Most recent payroll period
          </p>

        </div>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="relative max-w-md mb-6">

        <Search
          size={18}
          className="absolute left-105 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search by month or status..."
          className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-black outline-none focus:ring-2 focus:ring-blue-500"
        />

      </div>

      {/* =================================================
          PAYSLIP TABLE
      ================================================= */}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1050px] text-sm">

            <thead className="bg-gray-50 border-b border-gray-200">

              <tr className="text-left text-gray-500">

                <th className="px-5 py-3 font-medium">
                  Month
                </th>

                <th className="px-5 py-3 font-medium">
                  Basic
                </th>

                <th className="px-5 py-3 font-medium">
                  Gross
                </th>

                <th className="px-5 py-3 font-medium">
                  PF
                </th>

                <th className="px-5 py-3 font-medium">
                  ESI
                </th>

                <th className="px-5 py-3 font-medium">
                  PT
                </th>

                <th className="px-5 py-3 font-medium">
                  TDS
                </th>

                <th className="px-5 py-3 font-medium">
                  LOP
                </th>

                <th className="px-5 py-3 font-medium">
                  Net Pay
                </th>

                <th className="px-5 py-3 font-medium">
                  Status
                </th>

                <th className="px-5 py-3 font-medium text-right">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredPayslips.length === 0 ? (

                <tr>

                  <td
                    colSpan={11}
                    className="px-5 py-12 text-center"
                  >

                    <div className="flex flex-col items-center">

                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">

                        <WalletCards
                          size={22}
                          className="text-gray-400"
                        />

                      </div>

                      <p className="text-sm font-medium text-gray-700 mt-4">
                        No payslips available
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Your processed payroll records will appear here.
                      </p>

                    </div>

                  </td>

                </tr>

              ) : (

                filteredPayslips.map(
                  (payslip) => (

                    <tr
                      key={payslip.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                    >

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {payslip.month}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.basic
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.gross
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.pf
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.esi
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.pt
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.tds
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {formatCurrency(
                          payslip.lop
                        )}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatCurrency(
                          payslip.net_pay
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            payslip.status ===
                            "approved"
                              ? "bg-green-100 text-green-700"
                              : payslip.status ===
                                "processed"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {
                            payslip.status ||
                            "Pending"
                          }
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            handleDownload(
                              payslip
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >

                          <Download
                            size={15}
                          />

                          Download

                        </button>

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