import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Droplet, Mountain, Sprout, ArrowLeft, Save } from "lucide-react";
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

export default function SampleEntry() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id && id !== "new");
  
  const { data: existingSample, isLoading: loadingSample } = useGetSample(Number(id), { 
    query: { enabled: isEdit } 
  });
  const { data: folders } = useGetFolders();
  const { createSample, updateSample } = useSamplesMutations();

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

  useEffect(() => {
    if (existingSample && isEdit) {
      reset({
        sampleType: existingSample.sampleType as any,
        sampleId: existingSample.sampleId,
        folderId: existingSample.folderId ? String(existingSample.folderId) : '',
        notes: existingSample.notes || '',
        fields: existingSample.fields || {}
      });
    }
  }, [existingSample, isEdit, reset]);

  const currentType = watch("sampleType");
  const isPending = createSample.isPending || updateSample.isPending;

  const onSubmit = (data: FormValues) => {
    // Process form data to ensure correct types (numbers instead of strings where possible)
    const processedFields: Record<string, any> = {};
    Object.entries(data.fields).forEach(([k, v]) => {
      if (v === "") return; // Skip empty
      const num = Number(v);
      processedFields[k] = !isNaN(num) && typeof v === 'string' && v.trim() !== '' ? num : v;
    });

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

  if (isEdit && loadingSample) return <Layout><div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-slate-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-slate-200 rounded col-span-2"></div><div className="h-2 bg-slate-200 rounded col-span-1"></div></div><div className="h-2 bg-slate-200 rounded"></div></div></div></div></Layout>;

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
            <BaseFields register={register} errors={errors} />

            <div className="h-px bg-border/60 w-full" />
            
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="folderId">Organization Folder (Optional)</Label>
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
