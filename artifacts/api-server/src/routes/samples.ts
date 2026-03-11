import { Router, type IRouter } from "express";
import { db, samplesTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

const router: IRouter = Router();

router.get("/samples", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const folderIdParam = req.query.folderId;

  let samples;
  if (folderIdParam !== undefined && folderIdParam !== null && folderIdParam !== "") {
    const folderId = parseInt(folderIdParam as string, 10);
    samples = await db
      .select()
      .from(samplesTable)
      .where(and(eq(samplesTable.userId, userId), eq(samplesTable.folderId, folderId)))
      .orderBy(samplesTable.createdAt);
  } else {
    samples = await db
      .select()
      .from(samplesTable)
      .where(eq(samplesTable.userId, userId))
      .orderBy(samplesTable.createdAt);
  }

  res.json(samples);
});

router.post("/samples", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const { sampleType, sampleId, folderId, notes, fields } = req.body;

  if (!sampleType || !["water", "rock", "soil_sand"].includes(sampleType)) {
    res.status(400).json({ error: "Invalid sampleType" });
    return;
  }
  if (!sampleId || typeof sampleId !== "string") {
    res.status(400).json({ error: "sampleId is required" });
    return;
  }

  const [sample] = await db
    .insert(samplesTable)
    .values({
      sampleType,
      sampleId,
      userId,
      folderId: folderId ?? null,
      notes: notes ?? null,
      fields: fields ?? {},
    })
    .returning();
  res.status(201).json(sample);
});

router.get("/samples/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const id = parseInt(req.params.id, 10);
  const [sample] = await db
    .select()
    .from(samplesTable)
    .where(and(eq(samplesTable.id, id), eq(samplesTable.userId, userId)));
  if (!sample) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sample);
});

router.put("/samples/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const id = parseInt(req.params.id, 10);
  const { sampleId, folderId, notes, fields } = req.body;

  const updates: Record<string, unknown> = {};
  if (sampleId !== undefined) updates.sampleId = sampleId;
  if (folderId !== undefined) updates.folderId = folderId;
  if (notes !== undefined) updates.notes = notes;
  if (fields !== undefined) updates.fields = fields;

  const [sample] = await db
    .update(samplesTable)
    .set(updates)
    .where(and(eq(samplesTable.id, id), eq(samplesTable.userId, userId)))
    .returning();
  if (!sample) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sample);
});

router.delete("/samples/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const id = parseInt(req.params.id, 10);
  const deleted = await db
    .delete(samplesTable)
    .where(and(eq(samplesTable.id, id), eq(samplesTable.userId, userId)))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

router.patch("/samples/:id/move", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;
  const id = parseInt(req.params.id, 10);
  const { folderId } = req.body;

  const [sample] = await db
    .update(samplesTable)
    .set({ folderId: folderId ?? null })
    .where(and(eq(samplesTable.id, id), eq(samplesTable.userId, userId)))
    .returning();
  if (!sample) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(sample);
});

export default router;
