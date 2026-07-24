import { Suspense } from "react";
import { getAcMasterData } from "./actions";
import { Database, Plus, Settings2 } from "lucide-react";
import { MasterDataClient } from "./master-data-client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "จัดการข้อมูลพื้นฐาน | Super Admin",
};

export default async function MasterDataPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    redirect("/login");
  }

  const { brands } = await getAcMasterData();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Database className="h-6 w-6 text-sky-600" />
            จัดการข้อมูลพื้นฐาน (Master Data)
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            จัดการรายการยี่ห้อและรุ่นเครื่องปรับอากาศที่เป็นมาตรฐานกลางของระบบ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="biz-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-2xl">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
                <Settings2 className="h-4 w-4" />
                สถิติข้อมูล
              </h3>
            </div>
            <div className="p-5">
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-bold text-slate-500">ยี่ห้อทั้งหมด</dt>
                  <dd className="text-2xl font-bold text-slate-950">{brands.length}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">รุ่นแอร์ทั้งหมด</dt>
                  <dd className="text-2xl font-bold text-slate-950">
                    {brands.reduce((sum, b) => sum + b.modelsCount, 0)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3">
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-zinc-500">กำลังโหลดข้อมูล...</div>}>
            <MasterDataClient initialBrands={brands} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
