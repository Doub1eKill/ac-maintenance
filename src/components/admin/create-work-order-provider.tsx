"use client";

import { createContext, useCallback, useContext, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createWorkOrderAction, getCreateWorkOrderFormData } from "@/app/admin/actions";
import { CreateWorkOrderModal } from "@/components/admin/create-work-order-modal";
import type { BuildingItem, PendingUser } from "@/components/admin/types";

/**
 * Owns the "สร้างใบงานซ่อมบำรุง" modal for the whole admin area.
 *
 * The button that opens it lives in the header, so it is on every page, but the
 * form behind it needs the full building tree and the technician roster. Those
 * are fetched the first time it opens and then kept, rather than loaded with
 * every page just in case — the tree is the heaviest query in the app and
 * putting it back in the shell would undo the point of splitting the dashboard.
 *
 * Pages that open it for a specific unit (the overview's urgent list, the
 * calendar) call openForUnit(acId); the header button calls openBlank().
 */
interface CreateWorkOrderContextValue {
  openBlank: () => void;
  openForUnit: (acId: string) => void;
  // The unit the last order was raised for, with a token that changes per
  // creation. The board reads it to show and open the building the new row
  // sits in — the modal lives up here in the shell, so the board cannot
  // learn it any other way.
  lastCreated: { airConditionerId: string; token: number } | null;
  // The board calls this once the user has paged or clicked past the focus.
  clearLastCreated: () => void;
  // The board's mount/unmount pair. The provider lives in the admin layout,
  // so a focus would otherwise be handed to every later mount of the board
  // for the rest of the session. releaseLastCreated clears on the next tick
  // rather than at once, and keepLastCreated cancels that: React's dev-mode
  // StrictMode unmounts and remounts every component once on mount, and an
  // immediate clear in that simulated unmount would drop the focus before
  // the real board ever showed it.
  keepLastCreated: () => void;
  releaseLastCreated: () => void;
}

const CreateWorkOrderContext = createContext<CreateWorkOrderContextValue>({
  openBlank: () => {},
  openForUnit: () => {},
  lastCreated: null,
  clearLastCreated: () => {},
  keepLastCreated: () => {},
  releaseLastCreated: () => {},
});

export function useCreateWorkOrder() {
  return useContext(CreateWorkOrderContext);
}

interface FormData {
  buildings: BuildingItem[];
  allAcUnits: Array<{ id: string; label: string }>;
  activeTechnicians: PendingUser[];
}

export function CreateWorkOrderProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [defaultAcId, setDefaultAcId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [lastCreated, setLastCreated] = useState<CreateWorkOrderContextValue["lastCreated"]>(null);
  const clearLastCreated = useCallback(() => setLastCreated(null), []);
  const pendingRelease = useRef<number | null>(null);
  const keepLastCreated = useCallback(() => {
    if (pendingRelease.current !== null) {
      window.clearTimeout(pendingRelease.current);
      pendingRelease.current = null;
    }
  }, []);
  const releaseLastCreated = useCallback(() => {
    keepLastCreated();
    pendingRelease.current = window.setTimeout(() => {
      pendingRelease.current = null;
      setLastCreated(null);
    }, 0);
  }, [keepLastCreated]);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (formData) return;
    try {
      const data = await getCreateWorkOrderFormData();
      setFormData(data as FormData);
    } catch (error) {
      console.error("Failed to load the create-work-order form:", error);
      toast.error("ไม่สามารถโหลดรายการเครื่องปรับอากาศได้");
      setOpen(false);
    }
  }, [formData]);

  const openBlank = useCallback(() => {
    setDefaultAcId(null);
    setOpen(true);
    void load();
  }, [load]);

  const openForUnit = useCallback(
    (acId: string) => {
      setDefaultAcId(acId);
      setOpen(true);
      void load();
    },
    [load]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = new window.FormData(e.currentTarget);
    if (!body.get("airConditionerId")) {
      toast.error("กรุณาเลือกเครื่องปรับอากาศที่ต้องการแจ้งซ่อม");
      return;
    }

    startTransition(async () => {
      const res = await createWorkOrderAction(body);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("ออกใบงานซ่อมบำรุงด่วนเรียบร้อยแล้ว");
        setLastCreated({ airConditionerId: String(body.get("airConditionerId")), token: Date.now() });
        setOpen(false);
      }
    });
  }

  return (
    <CreateWorkOrderContext.Provider value={{ openBlank, openForUnit, lastCreated, clearLastCreated, keepLastCreated, releaseLastCreated }}>
      {children}
      {open && formData && (
        <CreateWorkOrderModal
          open={open}
          defaultAcId={defaultAcId}
          buildings={formData.buildings}
          activeTechnicians={formData.activeTechnicians}
          isPending={isPending}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </CreateWorkOrderContext.Provider>
  );
}
