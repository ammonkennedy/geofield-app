import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Droplet, Mountain, Sprout, ArrowLeft, Save, Camera, X, MapPin, Loader2 } from "lucide-react";
import { useSamplesMutations } from "@/hooks/use-geofield";
import { useGetFolders, useGetSample } from "@workspace/api-client-react";
import { BaseFields, WaterFields, RockFields, SoilFields } from "@/components/fields/SchemaForms";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const sampleTypes = [
  { id: 'water', label: 'Water', icon: Droplet, color: 'text-[var(--color-water)]', bg: 'bg-[var(--color-water)]/10' },
  { id: 'rock', label: 'Rock', icon: Mountain, color: 'text-[var(--color-rock)]', bg: 'bg-[var(--color-rock)]/10' },
  { id: 'soil_sand', label: 'Soil/Sand', icon: Sprout, color: 'text-[var(--color-soil)]', bg: 'bg-[var(--color-soil)]/10' },
] as const;

const formSchema = z.object({
  sampleType: z.enum(['water', 'rock', 'soil_sand']),
  sampleId: z.string().min(1, "Sample ID is required"),
  folderId: z.string().optional(),
  notes: z.string().optional(),
  fields: z.record(z.any()),
});

type FormValues = z.infer<typeof formSchema>;

type GpsStatus = "idle" | "loading" | "success" | "error" | "denied";

export default function SampleEntry() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id && id !== "new");

  const { data: existingSample, isLoading: loadingSample } = useGetSample(Number(id), {
    query: { enabled: isEdit }
  });
  const { data: folders } = useGetFolders();
  const { createSample, updateSample } = useSamplesMutations();

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sampleType: 'rock',
      sampleId: '',
      folderId: '',
      notes: '',
      fields: {}
    }
  });

  // Auto-capture GPS on new sample
  useEffect(() => {
    if (isEdit) return;
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setValue("fields.location", `${lat}, ${lng}`);
        setGpsStatus("success");
      },
      (err) => {
        setGpsStatus(err.code === 1 ? "denied" : "error");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [isEdit, setValue]);

  useEffect(() => {
    if (existingSample && isEdit) {
      const fields = existingSample.fields as Record<string, any> || {};
      if (fields.photo) {
        setPhotoDataUrl(fields.photo);
      }
      reset({
        sampleType: existingSample.sampleType as any,
        sampleId: existingSample.sampleId,
        folderId: existingSample.folderId ? String(existingSample.folderId) : '',
        notes: existingSample.notes || '',
        fields: { ...fields, photo: undefined }
      });
    }
  }, [existingSample, isEdit, reset]);

  const currentType = watch("sampleType");
  const isPending = createSample.isPending || updateSample.isPending;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotoDataUrl(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoDataUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: FormValues) => {
    const processedFields: Record<string, any> = {};
    Object.entries(data.fields).forEach(([k, v]) => {
      if (v === "") return;
      const num = Number(v);
      processedFields[k] = !isNaN(num) && typeof v === 'string' && v.trim() !== '' ? num : v;
    });

    if (photoDataUrl) {
      processedFields.photo = photoDataUrl;
    }

    const payload = {
      sampleType: data.sampleType,
      sampleId: data.sampleId,
      folderId: data.folderId ? Number(data.folderId) : null,
      notes: data.notes,
      fields: processedFields
    };

    if (isEdit && id) {
      updateSample.mutate({ id: Number(id), data: payload }, {
        onSuccess: () => setLocation("/")
      });
    } else {
      createSample.mutate({ data: payload }, {
        onSuccess: () => setLocation("/")
      });
    }
  };

  if (isEdit && loadingSample) return (
    <Layout>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-display">{isEdit ? "Edit Sample" : "New Field Sample"}</h1>
          <p className="text-muted-foreground mt-1">Record accurate parameter data directly from the field.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">

        {/* Type Selection */}
        <div className="space-y-3">
          <Label className="text-base">Sample Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleTypes.map((type) => {
              const isSelected = currentType === type.id;
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  onClick={() => !isEdit && setValue("sampleType", type.id, { shouldValidate: true })}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-300",
                    isSelected ? "border-primary ring-2 ring-primary/20 shadow-md bg-card" : isEdit ? "opacity-50 cursor-not-allowed bg-muted/50 border-transparent" : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                  )}
                >
                  {isSelected && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />}
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn("p-3 rounded-lg", type.bg, type.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-lg">{type.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Form Area */}
        <Card className="overflow-hidden shadow-lg border-border/50">
          <div className="p-6 md:p-8 space-y-8 bg-gradient-to-b from-card to-muted/20">

            {/* Section 1: Base Fields with GPS indicator */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">1</span>
                Basic Information
                {/* GPS Status indicator */}
                {!isEdit && (
                  <span className={cn(
                    "ml-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
                    gpsStatus === "loading" && "bg-yellow-100 text-yellow-700",
                    gpsStatus === "success" && "bg-green-100 text-green-700",
                    gpsStatus === "error" || gpsStatus === "denied" ? "bg-red-100 text-red-600" : "",
                    gpsStatus === "idle" && "bg-muted text-muted-foreground",
                  )}>
                    {gpsStatus === "loading" && <><Loader2 className="w-3 h-3 animate-spin" /> Getting GPS...</>}
                    {gpsStatus === "success" && <><MapPin className="w-3 h-3" /> GPS captured</>}
                    {gpsStatus === "denied" && <><MapPin className="w-3 h-3" /> Location denied</>}
                    {gpsStatus === "error" && <><MapPin className="w-3 h-3" /> GPS unavailable</>}
                  </span>
                )}
              </h3>
              <BaseFields register={register} errors={errors} />
            </div>

            <div className="h-px bg-border/60 w-full" />

            {/* Section 2: Type-specific parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">2</span>
                Parameters
              </h3>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentType}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentType === 'water' && <WaterFields register={register} />}
                  {currentType === 'rock' && <RockFields register={register} />}
                  {currentType === 'soil_sand' && <SoilFields register={register} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="h-px bg-border/60 w-full" />

            {/* Section 3: Photo */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">3</span>
                Sample Photo
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {photoDataUrl ? (
                  <div className="relative group">
                    <img
                      src={photoDataUrl}
                      alt="Sample"
                      className="w-40 h-40 object-cover rounded-xl border border-border shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl(null)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-40 h-40 rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-8 h-8" />
                    <span className="text-xs text-center px-2">Tap to add photo</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4" />
                    {photoDataUrl ? "Replace Photo" : "Take / Upload Photo"}
                  </Button>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    On mobile, this will open your camera directly. On desktop, you can upload an existing image.
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60 w-full" />

            {/* Section 4: Folder & Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">4</span>
                Organization
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="folderId">Folder (Optional)</Label>
                  <select
                    id="folderId"
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                    {...register("folderId")}
                  >
                    <option value="">Uncategorized</option>
                    {folders?.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Field Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional observations, weather conditions, context..."
                    className="min-h-[120px]"
                    {...register("notes")}
                  />
                </div>
              </div>
            </div>

          </div>
        </Card>

        <div className="flex justify-end gap-4 sticky bottom-6 z-20">
          <Button type="button" variant="outline" size="lg" className="bg-background shadow-md" onClick={() => setLocation("/")}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={isPending} className="shadow-xl">
            <Save className="w-5 h-5 mr-2" />
            {isPending ? "Saving..." : isEdit ? "Update Sample" : "Save Sample"}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
