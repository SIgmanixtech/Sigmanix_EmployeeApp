"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Mail,
  Lock,
  LogOut,
  Headphones,
  ShieldCheck,
  UserCircle,
  Building2,
  MapPin,
  Phone,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
};

type OrganizationSettings = {
  company_name: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
};

export default function EmployeeSettingsPage() {
  const router = useRouter();

  const [employee, setEmployee] =
    useState<Employee | null>(null);

  const [company, setCompany] =
    useState<OrganizationSettings | null>(null);

  const [showSupport, setShowSupport] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // LOAD EMPLOYEE + COMPANY DETAILS
  // =====================================================

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // -------------------------------------------------
        // CURRENT AUTH USER
        // -------------------------------------------------

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        // -------------------------------------------------
        // PROFILE
        // -------------------------------------------------

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

        // -------------------------------------------------
        // EMPLOYEE ONLY
        // -------------------------------------------------

        if (
          profile.role !== "employee"
        ) {
          router.replace(
            "/dashboard"
          );

          return;
        }

        // -------------------------------------------------
        // FIRST LOGIN PASSWORD CHANGE
        // -------------------------------------------------

        if (
          profile.must_change_password ===
          true
        ) {
          router.replace(
            "/employee/change-password"
          );

          return;
        }

        if (!profile.employee_id) {
          console.error(
            "No employee linked to this account."
          );

          return;
        }

        // -------------------------------------------------
        // EMPLOYEE DETAILS
        // -------------------------------------------------

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(
            "id, full_name, email"
          )
          .eq(
            "id",
            profile.employee_id
          )
          .maybeSingle();

        if (employeeError) {
          console.error(
            "Employee settings error:",
            employeeError
          );

          return;
        }

        setEmployee(
          employeeData
        );

        // -------------------------------------------------
        // ORGANIZATION DETAILS
        // -------------------------------------------------

        const {
          data: companyData,
          error: companyError,
        } = await supabase
          .from(
            "organization_settings"
          )
          .select(
            `
            company_name,
            company_email,
            company_phone,
            company_address
            `
          )
          .limit(1)
          .maybeSingle();

        if (companyError) {
          console.error(
            "Organization settings error:",
            companyError
          );
        } else {
          setCompany(
            companyData
          );
        }
      } catch (error) {
        console.error(
          "Settings page error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmed) {
      return;
    }

    await supabase.auth.signOut();

    router.replace("/login");
  };

  // =====================================================
  // CONTACT HR
  // =====================================================

  const handleContactHR = () => {
    setShowSupport(true);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">

        <p className="text-sm text-gray-500">
          Loading settings...
        </p>

      </div>
    );
  }

  // =====================================================
  // EMPLOYEE NOT FOUND
  // =====================================================

  if (!employee) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4">

        <div className="text-center">

          <p className="text-sm font-medium text-gray-700">
            Employee account not found.
          </p>

          <p className="text-xs text-gray-500 mt-2">
            Please contact your administrator.
          </p>

        </div>

      </div>
    );
  }

  return (
    <>
      <main className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <div className="mb-7">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">

              <Settings size={21} />

            </div>

            <div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Settings
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Manage your account and security settings
              </p>

            </div>

          </div>

        </div>

        {/* =================================================
            ACCOUNT & SECURITY
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-2xl mb-5 overflow-hidden">

          <div className="px-5 sm:px-6 py-4 border-b border-gray-200">

            <div className="flex items-center gap-2">

              <ShieldCheck
                size={19}
                className="text-[#034EA2]"
              />

              <h2 className="text-base font-semibold text-gray-900">
                Account & Security
              </h2>

            </div>

          </div>

          <div className="divide-y divide-gray-100">

            {/* EMPLOYEE NAME */}

            <SettingRow
              icon={
                <UserCircle size={19} />
              }
              title="Employee Name"
              description={
                employee.full_name
              }
            />

            {/* LOGIN EMAIL */}

            <SettingRow
              icon={
                <Mail size={19} />
              }
              title="Login Email"
              description={
                employee.email ||
                "Email not available"
              }
            />

            {/* PASSWORD */}

            <SettingRow
              icon={
                <Lock size={19} />
              }
              title="Password"
              description="Change your account password"
              action={
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/employee/change-password"
                    )
                  }
                  className="
                    rounded-lg
                    border
                    border-blue-200
                    bg-blue-50
                    px-4
                    py-2
                    text-sm
                    font-medium
                    text-blue-600
                    hover:bg-blue-100
                    transition
                  "
                >
                  Change Password
                </button>
              }
            />

          </div>

        </section>

        {/* =================================================
            SESSION & SECURITY
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-2xl mb-5 overflow-hidden">

          <div className="px-5 sm:px-6 py-4 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Session & Security
            </h2>

          </div>

          <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div>

              <p className="text-sm font-medium text-gray-900">
                Sign out of this account
              </p>

              <p className="text-xs text-gray-500 mt-1">
                End your current SIGMANIX HRMS session
              </p>

            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-red-200
                bg-red-50
                px-4
                py-2.5
                text-sm
                font-medium
                text-red-600
                hover:bg-red-100
                transition
              "
            >

              <LogOut size={17} />

              Logout

            </button>

          </div>

        </section>

        {/* =================================================
            SUPPORT
        ================================================= */}

        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 sm:px-6 py-4 border-b border-gray-200">

            <h2 className="text-base font-semibold text-gray-900">
              Support
            </h2>

          </div>

          <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">

                <Headphones size={19} />

              </div>

              <div>

                <p className="text-sm font-medium text-gray-900">
                  Need help?
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Contact HR or your administrator for assistance
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={
                handleContactHR
              }
              className="
                rounded-lg
                border
                border-gray-300
                px-4
                py-2.5
                text-sm
                font-medium
                text-gray-700
                hover:bg-gray-50
                transition
              "
            >
              Contact HR
            </button>

          </div>

        </section>

      </main>

      {/* =====================================================
          SUPPORT POPUP
      ===================================================== */}

      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

              <div>

                <h2 className="text-xl font-bold text-gray-900">
                  Support
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Contact your organization for assistance.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowSupport(false)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition"
                aria-label="Close support"
              >
                <X size={20} />
              </button>

            </div>

            {/* COMPANY DETAILS */}

            <div className="space-y-5 px-6 py-6">

              {/* COMPANY NAME */}

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Company Name
                  </p>

                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {company?.company_name ||
                      "Not provided"}
                  </p>

                </div>

              </div>

              {/* ADDRESS */}

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Company Address
                  </p>

                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                    {company?.company_address ||
                      "Not provided"}
                  </p>

                </div>

              </div>

              {/* EMAIL */}

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Company Email
                  </p>

                  <p className="mt-1 text-sm text-gray-700 break-all">
                    {company?.company_email ||
                      "Not provided"}
                  </p>

                </div>

              </div>

              {/* PHONE */}

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>

                <div>

                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Company Phone
                  </p>

                  <p className="mt-1 text-sm text-gray-700">
                    {company?.company_phone ||
                      "Not provided"}
                  </p>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="flex justify-end border-t border-gray-200 px-6 py-4">

              <button
                type="button"
                onClick={() =>
                  setShowSupport(false)
                }
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}

// =========================================================
// SETTING ROW
// =========================================================

function SettingRow({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

      <div className="flex items-center gap-3 min-w-0">

        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">

          {icon}

        </div>

        <div className="min-w-0">

          <p className="text-sm font-medium text-gray-900">
            {title}
          </p>

          <p className="text-xs text-gray-500 mt-1 break-all">
            {description}
          </p>

        </div>

      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}

    </div>
  );
}