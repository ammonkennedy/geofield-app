import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { X, Compass, CheckCircle, Smartphone, AlertTriangle } from "lucide-react";

interface CompassModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (strike: string, dip: string) => void;
}

type PermState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

function toDeg(rad: number) { return rad * (180 / Math.PI); }
function toRad(deg: number) { return deg * (Math.PI / 180); }
function mod360(n: number) { return ((n % 360) + 360) % 360; }

function formatBearing(deg: number) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(mod360(deg) / 22.5) % 16];
}

export function CompassModal({ open, onClose, onCapture }: CompassModalProps) {
  const [permState, setPermState] = useState<PermState>("idle");
  const [alpha, setAlpha] = useState<number | null>(null);
  const [dip, setDip] = useState<number>(0);
  const [locked, setLocked] = useState(false);
  const [lockedStrike, setLockedStrike] = useState<number>(0);
  const [lockedDip, setLockedDip] = useState<number>(0);
  const orientRef = useRef<{ alpha: number; dip: number }>({ alpha: 0, dip: 0 });

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    const a = e.alpha;
    const bRad = toRad(e.beta);
    const gRad = toRad(e.gamma);
    // Overall tilt from horizontal = dip angle when phone is flat on rock
    const dipAngle = Math.round(toDeg(Math.acos(
      Math.min(1, Math.abs(Math.cos(bRad) * Math.cos(gRad)))
    )));
    orientRef.current = { alpha: a, dip: dipAngle };
    setAlpha(mod360(a));
    setDip(dipAngle);
  }, []);

  const startListening = useCallback(() => {
    window.addEventListener("deviceorientation", handleOrientation, true);
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    setPermState("requesting");
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          setPermState("granted");
          startListening();
        } else {
          setPermState("denied");
        }
      } catch {
        setPermState("denied");
      }
    } else if (window.DeviceOrientationEvent) {
      setPermState("granted");
      startListening();
    } else {
      setPermState("unavailable");
    }
  }, [startListening]);

  useEffect(() => {
    if (!open) return;
    setLocked(false);
    setAlpha(null);
    setDip(0);

    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission !== "function") {
      // Android or desktop — no explicit permission needed
      if (window.DeviceOrientationEvent) {
        setPermState("granted");
        startListening();
      } else {
        setPermState("unavailable");
      }
    } else {
      setPermState("idle");
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [open, handleOrientation, startListening]);

  if (!open) return null;

  const strike = alpha !== null ? mod360(alpha) : 0;
  const dipDisplay = dip;
  const dipDirection = alpha !== null ? mod360(alpha + 90) : 0;

  const handleLock = () => {
    const s = Math.round(orientRef.current.alpha);
    const d = orientRef.current.dip;
    setLockedStrike(mod360(s));
    setLockedDip(d);
    setLocked(true);
  };

  const handleSave = () => {
    const strikeStr = `${lockedStrike.toString().padStart(3, "0")}°`;
    const dipStr = `${lockedDip}°`;
    onCapture(strikeStr, dipStr);
    onClose();
  };

  const needleRotation = alpha !== null ? -alpha : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <Compass className="w-5 h-5 text-primary" />
            Strike &amp; Dip Compass
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Instructions */}
          <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
            <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Place phone <strong>face-up flat on the rock surface</strong>, with the top of the phone aligned along the strike direction, then tap Lock.</span>
          </div>

          {permState === "idle" && (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">This device requires permission to access the compass sensor.</p>
              <Button onClick={requestPermission} className="w-full">Enable Compass</Button>
            </div>
          )}

          {permState === "requesting" && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Requesting sensor access...
            </div>
          )}

          {permState === "denied" && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Sensor access denied. Please allow motion &amp; orientation in your device settings, then reopen this dialog.</span>
            </div>
          )}

          {permState === "unavailable" && (
            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 rounded-xl p-3 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Your device doesn't support orientation sensors. Enter strike and dip manually in the form.</span>
            </div>
          )}

          {permState === "granted" && (
            <>
              {/* Compass rose */}
              <div className="flex justify-center">
                <div className="relative w-44 h-44">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-border bg-muted/30" />
                  {/* Cardinal labels */}
                  {[
                    { label: "N", top: "4px", left: "50%", transform: "translateX(-50%)" },
                    { label: "S", bottom: "4px", left: "50%", transform: "translateX(-50%)" },
                    { label: "E", top: "50%", right: "4px", transform: "translateY(-50%)" },
                    { label: "W", top: "50%", left: "4px", transform: "translateY(-50%)" },
                  ].map(({ label, ...style }) => (
                    <span
                      key={label}
                      className="absolute text-xs font-bold text-muted-foreground"
                      style={style as any}
                    >
                      {label}
                    </span>
                  ))}
                  {/* Tick marks */}
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0"
                      style={{ transform: `rotate(${i * 10}deg)` }}
                    >
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 bg-border ${i % 9 === 0 ? "h-3 w-0.5" : "h-1.5 w-px"}`}
                        style={{ top: "6px" }}
                      />
                    </div>
                  ))}
                  {/* Needle */}
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
                    style={{ transform: `rotate(${needleRotation}deg)` }}
                  >
                    <div className="relative w-2 h-36">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderBottom: "72px solid #ef4444",
                        }}
                      />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderTop: "72px solid #94a3b8",
                        }}
                      />
                    </div>
                  </div>
                  {/* Center dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-card border-2 border-primary z-10" />
                  </div>
                  {/* Heading overlay */}
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-center">
                    <span className="font-mono font-bold text-sm">
                      {alpha !== null ? `${Math.round(alpha)}°` : "--°"}
                      {alpha !== null ? ` ${formatBearing(alpha)}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dip bar */}
              <div className="mt-6 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Dip Angle</span>
                  <span className="font-mono font-bold text-foreground text-sm">{dipDisplay}°</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.min(100, (dipDisplay / 90) * 100)}%`,
                      background: dipDisplay > 60
                        ? "#ef4444"
                        : dipDisplay > 30
                        ? "#f59e0b"
                        : "#22c55e",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0° (horizontal)</span>
                  <span>90° (vertical)</span>
                </div>
              </div>

              {/* Live readout */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Strike</p>
                  <p className="font-mono font-bold text-xl">
                    {alpha !== null ? `${Math.round(mod360(alpha)).toString().padStart(3, "0")}°` : "--°"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {alpha !== null ? formatBearing(mod360(alpha)) : ""}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Dip</p>
                  <p className="font-mono font-bold text-xl">{dipDisplay}°</p>
                  <p className="text-xs text-muted-foreground">
                    {alpha !== null ? `dir. ${formatBearing(dipDirection)}` : ""}
                  </p>
                </div>
              </div>

              {/* Locked result */}
              {locked && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 rounded-xl p-3 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Locked: Strike <strong>{lockedStrike.toString().padStart(3, "0")}°</strong>, Dip <strong>{lockedDip}°</strong>
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2">
                {!locked ? (
                  <Button className="flex-1" onClick={handleLock} disabled={alpha === null}>
                    Lock Measurement
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => setLocked(false)}>
                      Re-measure
                    </Button>
                    <Button className="flex-1" onClick={handleSave}>
                      Save to Form
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
