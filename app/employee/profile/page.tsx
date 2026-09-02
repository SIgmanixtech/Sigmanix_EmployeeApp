"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircle,
  Mail,
  Phone,
  Building2,
  BriefcaseBusiness,
  Users,
  CalendarDays,
  Droplets,
  MapPin,
  Landmark,
  CreditCard,
  BadgeIndianRupee,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  employee_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;

  department: string | null;
  designation: string | null;
  team: string | null;
  employment_type: string | null;
  joining_date: string | null;
  status: string | null;

  dob: string | null;
  gender: string | null;
  blood_group: string | null;
  father_name: string | null;
  mother_name: string | null;
  marital_status: string | null;

  current_address: string | null;
  permanent_address: string | null;

  contact_name: string | null;
  contact_phone: string | null;

  bank_name: string | null;
  account_holder_name: string | null;
  ifsc_code: string | null;
  account_number: string | null;

  pan_number: string | null;
  aadhaar_number: string | null;
  uan_number: string | null;
  esic_number: string | null;

  leave_structure: string | null;
};

export default function EmployeeProfilePage() {
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // FETCH EMPLOYEE PROFILE
  // =====================================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // -------------------------------------------------
        // 1. CURRENT AUTH USER
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
        // 2. PROFILE
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
            "Profile fetch error:",
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
        // 3. EMPLOYEE ROLE ONLY
        // -------------------------------------------------

        if (profile.role !== "employee") {
          router.replace("/dashboard");
          return;
        }

        // -------------------------------------------------
        // 4. PASSWORD CHANGE CHECK
        // -------------------------------------------------

        if (
          profile.must_change_password === true
        ) {
          router.replace("/employee/change-password");
          return;
        }

        if (!profile.employee_id) {
          setEmployee(null);
          return;
        }

        // -------------------------------------------------
        // 5. EMPLOYEE DETAILS
        // -------------------------------------------------

        const {
          data: employeeData,
          error: employeeError,
        } = await supabase
          .from("employees")
          .select(`
            id,
            employee_id,
            full_name,
            email,
            phone,
            department,
            designation,
            team,
            employment_type,
            joining_date,
            status,
            dob,
            gender,
            blood_group,
            father_name,
            mother_name,
            marital_status,
            current_address,
            permanent_address,
            contact_name,
            contact_phone,
            bank_name,
            account_holder_name,
            ifsc_code,
            account_number,
            pan_number,
            aadhaar_number,
            uan_number,
            esic_number,
            leave_structure
          `)
          .eq("id", profile.employee_id)
          .maybeSingle();

        if (employeeError) {
          console.error(
            "Employee profile error:",
            employeeError
          );

          return;
        }

        setEmployee(employeeData);
      } catch (error) {
        console.error(
          "Employee profile page error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  // =====================================================
  // HELPERS
  // =====================================================

  const showValue = (
    value: string | null | undefined
  ) => {
    if (!value || value.trim() === "") {
      return "Not provided";
    }

    return value;
  };

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "Not provided";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center">

        <p className="text-sm text-gray-500">
          Loading your profile...
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
            Employee profile not found
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Your login account is not linked to an employee record.
          </p>

        </div>

      </div>
    );
  }

  return (
    <main className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

      {/* =================================================
          PROFILE HEADER
      ================================================= */}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 mb-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

          <div className="flex items-center gap-4">

            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">

              <UserCircle
                size={42}
                className="text-[#034EA2]"
              />

            </div>

            <div>

              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 capitalize">
                {employee.full_name}
              </h1>

              <p className="text-sm text-gray-500 mt-1">

                {showValue(
                  employee.designation
                )}

                <span className="mx-2">
                  ·
                </span>

                {showValue(
                  employee.department
                )}

              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3">

                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {showValue(
                    employee.employee_id
                  )}
                </span>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    employee.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {employee.status || "Inactive"}
                </span>

              </div>

            </div>

          </div>

          <button
  type="button"
  onClick={() =>
    router.push(
      "/employee/change-password"
    )
  }
  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <ShieldCheck size={17} />

  Change Password
</button>
        </div>

      </div>

      {/* =================================================
          BASIC / JOB INFO
      ================================================= */}

      <ProfileSection
        title="Account & Job Information"
        icon={
          <BriefcaseBusiness size={19} />
        }
      >

        <InfoItem
          icon={<Mail size={17} />}
          label="Email"
          value={showValue(employee.email)}
        />

        <InfoItem
          icon={<Phone size={17} />}
          label="Phone"
          value={showValue(employee.phone)}
        />

        <InfoItem
          icon={<Building2 size={17} />}
          label="Department"
          value={showValue(
            employee.department
          )}
        />

        <InfoItem
          icon={
            <BriefcaseBusiness size={17} />
          }
          label="Designation"
          value={showValue(
            employee.designation
          )}
        />

        <InfoItem
          icon={<Users size={17} />}
          label="Team"
          value={showValue(employee.team)}
        />

        <InfoItem
          icon={<UserCircle size={17} />}
          label="Employment Type"
          value={showValue(
            employee.employment_type
          )}
        />

        <InfoItem
          icon={<CalendarDays size={17} />}
          label="Joining Date"
          value={formatDate(
            employee.joining_date
          )}
        />

        <InfoItem
          icon={<CalendarDays size={17} />}
          label="Leave Structure"
          value={showValue(
            employee.leave_structure
          )}
        />

      </ProfileSection>

      {/* =================================================
          PERSONAL INFO
      ================================================= */}

      <ProfileSection
        title="Personal Information"
        icon={
          <UserCircle size={19} />
        }
      >

        <InfoItem
          label="Date of Birth"
          value={formatDate(
            employee.dob
          )}
        />

        <InfoItem
          label="Gender"
          value={showValue(
            employee.gender
          )}
        />

        <InfoItem
          icon={<Droplets size={17} />}
          label="Blood Group"
          value={showValue(
            employee.blood_group
          )}
        />

        <InfoItem
          label="Marital Status"
          value={showValue(
            employee.marital_status
          )}
        />

        <InfoItem
          label="Father's Name"
          value={showValue(
            employee.father_name
          )}
        />

        <InfoItem
          label="Mother's Name"
          value={showValue(
            employee.mother_name
          )}
        />

      </ProfileSection>

      {/* =================================================
          ADDRESS
      ================================================= */}

      <ProfileSection
        title="Address"
        icon={<MapPin size={19} />}
      >

        <InfoItem
          icon={<MapPin size={17} />}
          label="Current Address"
          value={showValue(
            employee.current_address
          )}
          wide
        />

        <InfoItem
          icon={<MapPin size={17} />}
          label="Permanent Address"
          value={showValue(
            employee.permanent_address
          )}
          wide
        />

      </ProfileSection>

      {/* =================================================
          EMERGENCY CONTACT
      ================================================= */}

      <ProfileSection
        title="Emergency Contact"
        icon={<Phone size={19} />}
      >

        <InfoItem
          label="Contact Name"
          value={showValue(
            employee.contact_name
          )}
        />

        <InfoItem
          icon={<Phone size={17} />}
          label="Contact Phone"
          value={showValue(
            employee.contact_phone
          )}
        />

      </ProfileSection>

      {/* =================================================
          BANK DETAILS
      ================================================= */}

      <ProfileSection
        title="Bank Details"
        icon={<Landmark size={19} />}
      >

        <InfoItem
          icon={<Landmark size={17} />}
          label="Bank Name"
          value={showValue(
            employee.bank_name
          )}
        />

        <InfoItem
          label="Account Holder"
          value={showValue(
            employee.account_holder_name
          )}
        />

        <InfoItem
          label="IFSC Code"
          value={showValue(
            employee.ifsc_code
          )}
        />

        <InfoItem
          icon={<CreditCard size={17} />}
          label="Account Number"
          value={showValue(
            employee.account_number
          )}
        />

      </ProfileSection>

      {/* =================================================
          GOVERNMENT / PAYROLL IDS
      ================================================= */}

      <ProfileSection
        title="Payroll & Government IDs"
        icon={
          <BadgeIndianRupee size={19} />
        }
      >

        <InfoItem
          label="PAN Number"
          value={showValue(
            employee.pan_number
          )}
        />

        <InfoItem
          label="Aadhaar Number"
          value={showValue(
            employee.aadhaar_number
          )}
        />

        <InfoItem
          label="UAN Number"
          value={showValue(
            employee.uan_number
          )}
        />

        <InfoItem
          label="ESIC Number"
          value={showValue(
            employee.esic_number
          )}
        />

      </ProfileSection>

    </main>
  );
}

// =========================================================
// PROFILE SECTION
// =========================================================

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl mb-5">

      <div className="flex items-center gap-2 border-b border-gray-200 px-5 sm:px-6 py-4">

        <span className="text-[#034EA2]">
          {icon}
        </span>

        <h2 className="text-base font-semibold text-gray-900">
          {title}
        </h2>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-8 gap-y-6 p-5 sm:p-6">

        {children}

      </div>

    </section>
  );
}

// =========================================================
// INFO ITEM
// =========================================================

function InfoItem({
  label,
  value,
  icon,
  wide = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "sm:col-span-2"
          : ""
      }
    >

      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <div className="flex items-start gap-2 mt-2">

        {icon && (
          <span className="text-gray-400 mt-0.5 shrink-0">
            {icon}
          </span>
        )}

        <p className="text-sm font-medium text-gray-800 break-words">
          {value}
        </p>

      </div>

    </div>
  );
}