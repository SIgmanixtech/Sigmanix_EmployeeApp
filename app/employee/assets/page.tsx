"use client";

import { useEffect, useState } from "react";
import { Laptop, Monitor, Smartphone, KeyRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Asset = {
  id: string;
  name: string;
  tag: string;
  assigned_date: string;
  condition: string;
  category: string;
};

const CATEGORY_ICONS: Record<string, any> = {
  Laptop: Laptop,
  Laptops: Laptop,
  Monitor: Monitor,
  Monitors: Monitor,
  Phone: Smartphone,
  Phones: Smartphone,
};

export default function MyAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("employee_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.employee_id) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("assets")
        .select("id, name, tag, assigned_date, condition, category")
        .eq("assigned_to", profile.employee_id)
        .order("assigned_date", { ascending: false });

      if (error) console.error(error);
      else setAssets(data || []);
      setLoading(false);
    };
    fetchAssets();
  }, []);

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">My Assets</h1>
        <p className="text-sm text-gray-600 mt-1">
          Equipment currently assigned to you. Contact IT/Admin for issues or returns.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500 py-10 text-center">Loading your assets...</p>}

      {!loading && assets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <KeyRound size={22} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No assets are currently assigned to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => {
            const Icon = CATEGORY_ICONS[asset.category] || Laptop;
            return (
              <div key={asset.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#EAF2FC] text-[#034EA2] flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-black truncate">{asset.name}</p>
                    <p className="text-xs text-gray-500 truncate">{asset.tag}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    Assigned {asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </span>
                  <span className="font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">
                    {asset.condition || "Good"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}