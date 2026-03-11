import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

// Shared common fields
export const BaseFields = ({ register, errors }: any) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="space-y-2">
      <Label htmlFor="sampleId">Sample ID / Label</Label>
      <Input id="sampleId" placeholder="e.g. W-24-001" {...register("sampleId")} />
      {errors.sampleId && <span className="text-xs text-destructive">{errors.sampleId.message}</span>}
    </div>
    <div className="space-y-2">
      <Label htmlFor="collectionDate">Collection Date</Label>
      <Input type="date" id="collectionDate" {...register("fields.collectionDate")} />
    </div>
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="location">Location / GPS</Label>
      <Input id="location" placeholder="Lat, Long or description" {...register("fields.location")} />
    </div>
  </div>
);

export const WaterFields = ({ register }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="space-y-2"><Label>Water Temp (°C)</Label><Input type="number" step="0.1" {...register("fields.temperature")} /></div>
    <div className="space-y-2"><Label>pH Level</Label><Input type="number" step="0.1" {...register("fields.ph")} /></div>
    <div className="space-y-2"><Label>Dissolved Oxygen (mg/L)</Label><Input type="number" step="0.1" {...register("fields.do")} /></div>
    <div className="space-y-2"><Label>Conductivity (μS/cm)</Label><Input type="number" step="0.1" {...register("fields.conductivity")} /></div>
    <div className="space-y-2"><Label>Turbidity (NTU)</Label><Input type="number" step="0.1" {...register("fields.turbidity")} /></div>
    <div className="space-y-2"><Label>Flow Rate (m³/s)</Label><Input type="number" step="0.01" {...register("fields.flowRate")} /></div>
    <div className="space-y-2"><Label>Water Color</Label><Input {...register("fields.color")} placeholder="e.g. Clear, murky brown" /></div>
    <div className="space-y-2"><Label>Odor</Label><Input {...register("fields.odor")} placeholder="e.g. None, sulfur" /></div>
    <div className="space-y-2"><Label>Preservation Method</Label><Input {...register("fields.preservation")} placeholder="e.g. HNO3, None" /></div>
  </div>
);

export const RockFields = ({ register }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="space-y-2"><Label>Rock Type</Label>
      <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" {...register("fields.rockType")}>
        <option value="">Select type...</option>
        <option value="Igneous">Igneous</option>
        <option value="Sedimentary">Sedimentary</option>
        <option value="Metamorphic">Metamorphic</option>
      </select>
    </div>
    <div className="space-y-2"><Label>Rock Name</Label><Input {...register("fields.rockName")} placeholder="e.g. Basalt, Sandstone" /></div>
    <div className="space-y-2"><Label>Color</Label><Input {...register("fields.color")} /></div>
    <div className="space-y-2"><Label>Texture</Label><Input {...register("fields.texture")} placeholder="e.g. Fine, Porphyritic" /></div>
    <div className="space-y-2"><Label>Hardness (Mohs)</Label><Input type="number" step="0.5" max="10" min="1" {...register("fields.hardness")} /></div>
    <div className="space-y-2"><Label>Specific Gravity</Label><Input type="number" step="0.1" {...register("fields.specificGravity")} /></div>
    <div className="space-y-2"><Label>Strike/Dip</Label><Input {...register("fields.strikeDip")} placeholder="e.g. 045/30SE" /></div>
    <div className="space-y-2"><Label>Magnetism</Label><Input {...register("fields.magnetism")} /></div>
    <div className="space-y-2"><Label>Weight (g)</Label><Input type="number" step="0.1" {...register("fields.weight")} /></div>
  </div>
);

export const SoilFields = ({ register }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div className="space-y-2"><Label>Soil Texture</Label>
      <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" {...register("fields.texture")}>
        <option value="">Select texture...</option>
        <option value="Sand">Sand</option>
        <option value="Silt">Silt</option>
        <option value="Clay">Clay</option>
        <option value="Loam">Loam</option>
      </select>
    </div>
    <div className="space-y-2"><Label>Color (Munsell)</Label><Input {...register("fields.color")} placeholder="e.g. 10YR 4/6" /></div>
    <div className="space-y-2"><Label>Horizon</Label><Input {...register("fields.horizon")} placeholder="e.g. O, A, B, C" /></div>
    <div className="space-y-2"><Label>Moisture Content</Label>
      <select className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" {...register("fields.moisture")}>
        <option value="">Select...</option>
        <option value="Dry">Dry</option>
        <option value="Moist">Moist</option>
        <option value="Wet">Wet</option>
      </select>
    </div>
    <div className="space-y-2"><Label>pH Level</Label><Input type="number" step="0.1" {...register("fields.ph")} /></div>
    <div className="space-y-2"><Label>Depth (cm)</Label><Input type="number" step="0.1" {...register("fields.depth")} /></div>
    <div className="space-y-2"><Label>Structure</Label><Input {...register("fields.structure")} placeholder="e.g. Granular, Blocky" /></div>
    <div className="space-y-2"><Label>Organic Matter (%)</Label><Input type="number" step="0.1" {...register("fields.organicMatter")} /></div>
    <div className="space-y-2"><Label>Weight (g)</Label><Input type="number" step="0.1" {...register("fields.weight")} /></div>
  </div>
);
