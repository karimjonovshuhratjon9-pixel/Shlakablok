import { useEffect, useState } from "react";
import { DatabaseBackup, AlertCircle } from "lucide-react";
import {
  countLegacyData,
  isLegacyMigrationDone,
  migrateLegacyData,
  type LegacyCounts,
} from "@/lib/legacyDexie";

/**
 * Eski versiyada ma'lumotlar faqat shu brauzerda saqlangan edi.
 * Agar brauzerda shunday ma'lumot qolgan bo'lsa, uni Supabase'ga ko'chirish taklif qilinadi.
 */
export function LegacyMigrationBanner() {
  const [counts, setCounts] = useState<LegacyCounts | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (isLegacyMigrationDone()) return;
    void countLegacyData().then((c) => {
      if (active) setCounts(c);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!counts) return null;

  async function handleMigrate() {
    setBusy(true);
    setError("");
    try {
      await migrateLegacyData();
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ko‘chirishda xatolik yuz berdi.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3 text-text-primary">
        <DatabaseBackup className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">
            Bu brauzerda eski ma’lumotlar topildi
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {counts.expenses} ta xarajat, {counts.batches} ta partiya,{" "}
            {counts.sales} ta sotuv. Kunlik hisobot ishlashi uchun ularni
            Supabase’ga ko‘chiring (ma’lumot o‘chib ketmaydi, dublikat ham
            bo‘lmaydi).
          </p>
          {error && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={handleMigrate}
        disabled={busy}
        className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {busy ? "Ko‘chirilmoqda..." : "Supabase’ga ko‘chirish"}
      </button>
    </div>
  );
}
