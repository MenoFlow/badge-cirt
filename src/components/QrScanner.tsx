import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "./ui/button";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onDetected: (text: string) => void;
  onClose?: () => void;
}

export function QrScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [devicesReady, setDevicesReady] = useState(false);
  const lastDetectedRef = useRef<{ text: string; ts: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      setError(
        window.isSecureContext
          ? "Caméra indisponible sur ce navigateur. Vérifiez les permissions ou utilisez la saisie manuelle."
          : "La caméra exige HTTPS, ou localhost en développement. Ouvrez l'application en HTTPS ou utilisez la saisie manuelle.",
      );
      return;
    }

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((d) => {
        setDevices(d);
        const back = d.find((x) => /back|rear|environment/i.test(x.label));
        setDeviceId((back ?? d[0])?.deviceId);
        setDevicesReady(true);
        if (!d.length) setError("Aucune caméra détectée sur cet appareil.");
      })
      .catch((e) => {
        setDevicesReady(true);
        setError(e?.message ?? "Caméra indisponible");
      });
  }, []);

  useEffect(() => {
    if (!cameraSupported || !devicesReady || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    const constraints: MediaStreamConstraints = deviceId
      ? { video: { deviceId: { exact: deviceId } } }
      : { video: { facingMode: { ideal: "environment" } } };

    reader
      .decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (stopped || !result) return;
        const text = result.getText();
        const now = Date.now();
        if (lastDetectedRef.current && lastDetectedRef.current.text === text && now - lastDetectedRef.current.ts < 1500) return;
        lastDetectedRef.current = { text, ts: now };
        onDetected(text);
      })
      .then((c) => {
        if (stopped) {
          c.stop();
          return;
        }
        controlsRef.current = c;
      })
      .catch((e) => {
        if (stopped || e?.name === "AbortError") return;
        if (e?.name === "NotAllowedError") {
          setError("Permission caméra refusée. Autorisez la caméra dans le navigateur ou saisissez le Badge ID.");
          return;
        }
        if (e?.name === "NotFoundError") {
          setError("Aucune caméra utilisable n'a été trouvée.");
          return;
        }
        if (e?.name === "NotReadableError") {
          setError("La caméra est déjà utilisée par une autre application ou un autre onglet.");
          return;
        }
        setError(e?.message ?? "Impossible de démarrer la caméra");
      });

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraSupported, devicesReady, deviceId, onDetected]);

  function switchCamera() {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    setDeviceId(devices[(idx + 1) % devices.length].deviceId);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-2xl overflow-hidden bg-black aspect-square sm:aspect-video w-full"
    >
      {cameraSupported && <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
      {cameraSupported ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: [0.9, 1, 0.9], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="size-48 sm:size-56 border-4 border-iris-lime rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
          />
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center p-5 text-center text-white/80">
          <div>
            <CameraOff className="mx-auto size-10 mb-3" />
            <div className="font-medium">Caméra non disponible</div>
            <div className="mt-1 text-sm">Utilisez le champ Badge ID au-dessus.</div>
          </div>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-2">
        {devices.length > 1 && (
          <Button size="sm" variant="secondary" onClick={switchCamera} className="bg-white/90">
            <RefreshCw className="size-3.5 mr-1" />Caméra
          </Button>
        )}
        {onClose && (
          <Button size="sm" variant="secondary" onClick={onClose} className="bg-white/90">
            <CameraOff className="size-3.5 mr-1" />Fermer
          </Button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-x-2 bottom-2 bg-destructive text-white text-sm rounded-lg p-3"
          >
            <div className="font-semibold flex items-center gap-2"><Camera className="size-4" />Erreur caméra</div>
            <div className="opacity-90">{error}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
