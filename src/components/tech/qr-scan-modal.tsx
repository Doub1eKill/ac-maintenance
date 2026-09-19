"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { QrCode, X, CheckCircle2, AlertTriangle, Camera, CameraOff, ClipboardPen, History, Loader2 } from "lucide-react";
import { scanQrCodeAction } from "@/app/tech/actions";
import { CatalogueMark } from "@/components/shared/catalogue-mark";
import { UnitThumb } from "@/components/shared/unit-thumb";

// The shape scanQrCodeAction returns when it finds the unit — the success
// half of its union, so the result panel below is typed against the action
// rather than against `any`.
export type QrScanResult = Extract<Awaited<ReturnType<typeof scanQrCodeAction>>, { acDetails: unknown }>;

interface QrScanModalProps {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onClaim: (workOrderId: string) => void;
  // Claim the unit's open job and go straight to the log form for it — one
  // step for the technician already standing at the machine, instead of
  // claim → งานของฉัน → บันทึกและปิดงาน.
  onClaimAndLog: (result: QrScanResult) => void;
  // The unit has no open job: hand it to the log form, which is where a
  // technician records work on a unit nobody has reported. This replaced a
  // "สร้างใบงาน PM ใหม่" button that only ever showed a toast — it created
  // nothing, and a technician in the field had no way to tell.
  onLogWork: (result: QrScanResult) => void;
  // The unit's maintenance history, in the same modal the header search
  // opens. A technician at the machine wants to know what was done to it
  // last time before deciding anything; the scan result only had the date.
  onViewHistory: (airConditionerId: string) => void;
  onScanError: (message: string) => void;
}

// The Barcode Detection API is not in TypeScript's DOM lib yet. Only the
// members used here are declared; the feature test below decides whether it
// exists at all.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = (new (options?: { formats: string[] }) => BarcodeDetectorLike) & {
  getSupportedFormats?: () => Promise<string[]>;
};

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

// Frames handed to the JavaScript decoder are downscaled to this on their
// longest side: a sticker fills a good part of the view when a technician
// aims at it, and decoding a 4K frame every quarter second on a phone is what
// makes a scanner feel stuck.
const DECODE_MAX_DIMENSION = 640;

/**
 * The QR reader for this browser: the platform's BarcodeDetector where it
 * exists and lists qr_code (Android and macOS Chrome), otherwise jsQR reading
 * the video through a canvas. The second path is what makes the camera work
 * on iOS — Safari has no BarcodeDetector at all, and before this the iPhone
 * got only the typed fallback (A4, E1). Same interface either way, so the
 * scanning loop does not know which one it has.
 *
 * Desktop Chrome on Windows and Linux defines BarcodeDetector but supports no
 * formats on it, so the constructor being present is not enough; that case
 * takes the JavaScript path too.
 */
async function createQrDetector(): Promise<BarcodeDetectorLike> {
  const Native = getBarcodeDetector();
  if (Native) {
    const formats = await (Native.getSupportedFormats?.() ?? Promise.resolve(["qr_code"]));
    if (formats.includes("qr_code")) return new Native({ formats: ["qr_code"] });
  }

  // Loaded only on the browsers that need it; the native path never pays
  // for the decoder's bundle.
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new DOMException("canvas 2d unavailable", "NotSupportedError");

  return {
    async detect(source) {
      // The loop only ever hands over the <video>; anything else is not a
      // frame this decoder knows how to read.
      if (!(source instanceof HTMLVideoElement)) return [];
      const vw = source.videoWidth;
      const vh = source.videoHeight;
      if (!vw || !vh) return [];
      const scale = Math.min(1, DECODE_MAX_DIMENSION / Math.max(vw, vh));
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // A sticker is dark on light; skipping the inverted attempt halves the
      // work per frame.
      const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      return code?.data ? [{ rawValue: code.data }] : [];
    },
  };
}

// Whether this browser can scan at all: a camera it can ask for. The decoder
// is no longer a condition — createQrDetector() always has one. A browser
// capability, not React state, so it is read through useSyncExternalStore
// rather than set from an effect. Never changes while the page is open.
const noSubscribe = () => () => {};
function readCameraSupport() {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

type CameraState =
  // Streaming stopped: a result is showing.
  | "idle"
  // getUserMedia is in flight.
  | "starting"
  // Streaming and being polled for a QR code.
  | "scanning"
  // No camera API, no camera, or permission refused. The typed fallback
  // below is the whole scanner in this state.
  | "unavailable";

const UNSUPPORTED_NOTE = "เบราว์เซอร์นี้ไม่รองรับการสแกนด้วยกล้อง — พิมพ์รหัสเครื่องหรือวางลิงก์จากสติกเกอร์แทน";

export function QrScanModal(props: QrScanModalProps) {
  // Everything stateful lives in the body, which is mounted only while the
  // modal is open — so closing it resets the typed code, the result and the
  // camera by unmounting, with no effect needed to do it by hand.
  if (!props.open) return null;
  return <QrScanModalBody {...props} />;
}

function QrScanModalBody({ isPending, onClose, onClaim, onClaimAndLog, onLogWork, onViewHistory, onScanError }: QrScanModalProps) {
  const supported = useSyncExternalStore(noSubscribe, readCameraSupport, () => false);

  const [typedCode, setTypedCode] = useState("");
  const [qrResult, setQrResult] = useState<QrScanResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [camera, setCamera] = useState<CameraState>(supported ? "starting" : "unavailable");
  // Why the camera could not be used, when it is a permission or device
  // problem rather than a missing API.
  const [cameraNote, setCameraNote] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Guards against a second lookup while one is running: the detector keeps
  // firing on every frame the code stays in view.
  const lookupRef = useRef(false);
  // The last camera read the server did not recognise, and when. The
  // detector reports the same code on every frame it stays in view, so
  // without this a sticker from another system (or any poster) raised a
  // "ไม่พบ" toast four times a second until the phone was moved. A typed
  // value is never held back — that is the user asking again on purpose.
  const rejectedRef = useRef<{ value: string; at: number } | null>(null);
  const REJECT_COOLDOWN_MS = 5000;

  // Read through a ref so lookUp — and the camera effect that depends on
  // it — keep their identity when tech-shell re-renders with a fresh inline
  // arrow. Otherwise every parent render would tear the stream down and
  // ask for the camera again.
  const onScanErrorRef = useRef(onScanError);
  useEffect(() => {
    onScanErrorRef.current = onScanError;
  }, [onScanError]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const lookUp = useCallback(
    async (scanned: string, source: "camera" | "typed") => {
      const value = scanned.trim();
      if (!value || lookupRef.current) return;
      if (source === "camera") {
        const rejected = rejectedRef.current;
        if (rejected && rejected.value === value && Date.now() - rejected.at < REJECT_COOLDOWN_MS) {
          return;
        }
      }
      lookupRef.current = true;
      setLookingUp(true);
      try {
        const res = await scanQrCodeAction(value);
        if (res.success) {
          stopCamera();
          setCamera("idle");
          setQrResult(res);
        } else {
          if (source === "camera") rejectedRef.current = { value, at: Date.now() };
          onScanErrorRef.current(res.error);
        }
      } finally {
        lookupRef.current = false;
        setLookingUp(false);
      }
    },
    [stopCamera]
  );

  // Camera lifecycle. Starts on mount and again after "สแกนเครื่องใหม่"
  // clears the result; stops on a successful read and on unmount (which is
  // how closing the modal stops it). The stream is the only resource here;
  // the polling loop below ends itself when the stream is gone. State is
  // only set from the promise callbacks, never from the effect body.
  useEffect(() => {
    if (!supported || qrResult) return;

    let cancelled = false;
    let timer: number | undefined;
    let detector: BarcodeDetectorLike | null = null;

    // The detector is built before the stream exists: if that fails there
    // is nothing left running behind the "ใช้กล้องไม่ได้" message.
    createQrDetector()
      .then((built) => {
        detector = built;
        return navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        // play() can reject when the element is torn down mid-call; the
        // cleanup below handles that case.
        video.play().catch(() => {});
        setCamera("scanning");

        const tick = async () => {
          if (cancelled || !streamRef.current || !detector) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !lookupRef.current) {
            try {
              const codes = await detector.detect(video);
              const hit = codes.find((c) => c.rawValue.trim());
              if (hit) {
                await lookUp(hit.rawValue, "camera");
              }
            } catch {
              // A frame the detector could not read; the next one may be
              // fine. Nothing to tell the user about.
            }
          }
          if (!cancelled && streamRef.current) {
            timer = window.setTimeout(tick, 250);
          }
        };
        void tick();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCamera("unavailable");
        const name = err instanceof DOMException ? err.name : "";
        setCameraNote(
          name === "NotAllowedError" || name === "SecurityError"
            ? "ไม่ได้รับอนุญาตให้ใช้กล้อง — อนุญาตในเบราว์เซอร์ หรือพิมพ์รหัสเครื่องด้านล่างแทน"
            : name === "NotSupportedError"
              ? UNSUPPORTED_NOTE
              : "เปิดกล้องไม่ได้ — พิมพ์รหัสเครื่องหรือวางลิงก์จากสติกเกอร์แทน"
        );
      });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      stopCamera();
    };
  }, [supported, qrResult, lookUp, stopCamera]);

  function scanAgain() {
    setQrResult(null);
    setTypedCode("");
    setCameraNote(null);
    setCamera(supported ? "starting" : "unavailable");
  }

  function handleTypedSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void lookUp(typedCode, "typed");
  }

  function handleClaimFromQr() {
    if (qrResult?.pendingJobId) {
      onClaim(qrResult.pendingJobId);
      onClose();
    }
  }

  function handleLogWork() {
    if (qrResult) {
      onLogWork(qrResult);
      onClose();
    }
  }

  const note = supported ? cameraNote : UNSUPPORTED_NOTE;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card p-6 pb-10 sm:pb-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <QrCode className="h-4 w-4 text-foreground" />
            <span>สแกนรหัส QR เครื่องปรับอากาศ</span>
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!qrResult ? (
          <>
            <div className="relative h-56 w-full rounded-xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center overflow-hidden">
              {/* Always mounted so the stream has somewhere to attach the
                  moment getUserMedia resolves; hidden until it is live. */}
              <video
                ref={videoRef}
                muted
                playsInline
                className={`absolute inset-0 h-full w-full object-cover ${camera === "scanning" ? "" : "hidden"}`}
              />
              {camera === "scanning" && (
                <>
                  <div className="absolute inset-x-0 h-0.5 bg-primary animate-laser" />
                  <div className="absolute inset-6 rounded-lg border-2 border-primary-foreground/70 pointer-events-none" />
                </>
              )}
              {camera === "starting" && (
                <>
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  <span className="text-[11px] font-semibold text-muted-foreground mt-2">กำลังเปิดกล้อง...</span>
                </>
              )}
              {camera === "unavailable" && (
                <>
                  <CameraOff className="h-10 w-10 text-muted-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground mt-2">ใช้กล้องไม่ได้</span>
                </>
              )}
              {camera === "idle" && (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            {camera === "scanning" && (
              <p className="text-[11px] font-semibold text-muted-foreground text-center -mt-2">
                เล็งกล้องไปที่ QR Code บนสติกเกอร์
              </p>
            )}
            {note && (
              <p className="text-[11px] text-warning-foreground bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 -mt-2">
                {note}
              </p>
            )}

            <form onSubmit={handleTypedSubmit} className="space-y-2">
              <label htmlFor="qr-typed-code" className="block text-[11px] font-bold text-foreground">
                หรือพิมพ์รหัสเครื่อง / วางลิงก์จากสติกเกอร์
              </label>
              <div className="flex gap-2">
                <input
                  id="qr-typed-code"
                  type="text"
                  value={typedCode}
                  onChange={(e) => setTypedCode(e.target.value)}
                  placeholder="เช่น PKRU-ENG-101-AC1"
                  autoComplete="off"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isPending || lookingUp || !typedCode.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shrink-0 disabled:opacity-50"
                >
                  {lookingUp ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4 animate-in zoom-in-95">
            <div className="bg-muted border border-border p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-start gap-3">
                {/* Picture first: the sticker just scanned should match the
                    machine in front of the technician, and this is the
                    fastest way to tell. */}
                <div className="flex min-w-0 items-start gap-3">
                  <UnitThumb src={qrResult.acDetails.photoUrl} alt={`เครื่อง ${qrResult.acDetails.acCode}`} size="lg" />
                  <div className="min-w-0">
                    <div className="font-mono text-lg font-bold text-foreground break-all">{qrResult.acDetails.acCode}</div>
                    <div className="text-xs text-muted-foreground font-medium">{qrResult.acDetails.location}</div>
                  </div>
                </div>
                <span className="bg-accent text-foreground text-[10px] font-bold px-2 py-1 rounded-md">
                  {qrResult.acDetails.brand}
                  <CatalogueMark
                    brandDeleted={qrResult.acDetails.brandDeleted}
                    modelDeleted={qrResult.acDetails.modelDeleted}
                    className="ml-1"
                  />
                </span>
              </div>

              <div className="border-t border-border pt-3 flex flex-col gap-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">สถานะล่าสุด:</span>
                  <span className={`font-bold inline-flex items-center gap-1 ${qrResult.acDetails.status === 'normal' ? 'text-success-foreground' : 'text-warning-foreground'}`}>
                    {qrResult.acDetails.status === 'normal' ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> ปกติ</>
                    ) : (
                      <><AlertTriangle className="h-3.5 w-3.5" /> มีปัญหา</>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ซ่อมบำรุงล่าสุด:</span>
                  <span className="font-semibold">{qrResult.acDetails.lastMaintenance ? format(new Date(qrResult.acDetails.lastMaintenance), "dd/MM/yyyy") : 'ไม่เคยซ่อมบำรุง'}</span>
                </div>
              </div>
            </div>

            {qrResult.pendingJobId ? (
              <div className="bg-warning/10 border border-warning/30 p-3 rounded-xl space-y-2">
                <div>
                  <div className="text-xs font-bold text-warning-foreground">มีใบงานค้างอยู่!</div>
                  <div className="text-[10px] text-warning-foreground">รับงานนี้ หรือรับแล้วบันทึกผลงานต่อเลย</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleClaimFromQr}
                    disabled={isPending}
                    className="border border-amber-600/40 bg-card text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-500/10 disabled:opacity-50"
                  >
                    รับงานทันที
                  </button>
                  <button
                    onClick={() => {
                      onClaimAndLog(qrResult);
                      onClose();
                    }}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-amber-700 shadow-sm disabled:opacity-50"
                  >
                    <ClipboardPen className="h-3.5 w-3.5" />
                    รับงานและบันทึกเลย
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/30 p-3 rounded-xl">
                <div className="text-xs font-bold text-success-foreground mb-2">ไม่พบใบงานแจ้งซ่อมค้างอยู่</div>
                <button
                  onClick={handleLogWork}
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-2 bg-success text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-success/90 shadow-sm"
                >
                  <ClipboardPen className="h-3.5 w-3.5" />
                  บันทึกงานซ่อมบำรุงเครื่องนี้
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onViewHistory(qrResult.acDetails.id);
                  onClose();
                }}
                className="inline-flex items-center justify-center gap-1.5 border border-border bg-card text-foreground text-xs font-bold px-3 py-2 rounded-lg hover:bg-muted"
              >
                <History className="h-3.5 w-3.5" />
                ดูประวัติเครื่องนี้
              </button>
              <button
                onClick={scanAgain}
                className="border border-border bg-card text-foreground text-xs font-bold px-3 py-2 rounded-lg hover:bg-muted"
              >
                สแกนเครื่องใหม่
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
