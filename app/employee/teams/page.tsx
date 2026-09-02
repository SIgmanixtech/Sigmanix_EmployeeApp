"use client";

import { useEffect, useState } from "react";
import { Search, Mail, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Person = {
  id: string;
  full_name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  status: string;
};

export default function TeamsDirectoryPage() {
  const [directory, setDirectory] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDirectory = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, designation, department, email, phone, status")
        .eq("status", "Active")
        .order("full_name", { ascending: true });
      if (error) console.error(error);
      else setDirectory(data || []);
      setLoading(false);
    };
    fetchDirectory();
  }, []);

  const departments = Array.from(new Set(directory.map((d) => d.department).filter(Boolean)));

  const filtered = directory.filter((d) => {
    if (search && !d.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && d.department !== deptFilter) return false;
    return true;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Teams Directory</h1>
        <p className="text-sm text-gray-600 mt-1">Browse and contact your colleagues.</p>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="absolute left-105 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#034EA2]"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#034EA2]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-sm text-gray-500 py-10 text-center col-span-full">Loading directory...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-500 py-10 text-center col-span-full">No colleagues found.</p>
        )}
        {!loading && filtered.map((person) => (
          <div key={person.id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#EAF2FC] text-[#034EA2] flex items-center justify-center text-sm font-semibold shrink-0">
                {person.full_name?.[0] || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black truncate">{person.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{person.designation}</p>
              </div>
            </div>
            <span className="inline-block text-[10px] font-semibold px-2 py-1 rounded-full bg-[#FEF3D9] text-[#8a5a10] mb-3">
              {person.department}
            </span>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p className="flex items-center gap-1.5 truncate">
                <Mail size={12} className="text-gray-500 shrink-0" />
                {person.email || "—"}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={12} className="text-gray-500 shrink-0" />
                {person.phone || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}