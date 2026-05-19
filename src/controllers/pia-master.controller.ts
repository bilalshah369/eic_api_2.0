import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ─── Minerals / Ores ────────────────────────────────────────────────────────

const listMinerals = async (_req: Request, res: Response) => {
  const items = await prisma.pIAMineralOre.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: items });
};

const createMineral = async (req: Request, res: Response): Promise<void> => {
  const { name, code, hsCode } = req.body;
  if (!name?.trim()) { res.status(400).json({ success: false, message: 'Name is required' }); return; }
  const item = await prisma.pIAMineralOre.create({
    data: { name: name.trim(), code: code?.trim() || null, hsCode: hsCode?.trim() || null },
  });
  res.status(201).json({ success: true, data: item });
};

const updateMineral = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, hsCode, isActive } = req.body;
  const item = await prisma.pIAMineralOre.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code?.trim() || null }),
      ...(hsCode !== undefined && { hsCode: hsCode?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json({ success: true, data: item });
};

const deleteMineral = async (req: Request, res: Response) => {
  await prisma.pIAMineralOre.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// ─── Ports ──────────────────────────────────────────────────────────────────

const listPorts = async (_req: Request, res: Response) => {
  const items = await prisma.pIAPort.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: items });
};

const createPort = async (req: Request, res: Response): Promise<void> => {
  const { name, code, state } = req.body;
  if (!name?.trim()) { res.status(400).json({ success: false, message: 'Name is required' }); return; }
  const item = await prisma.pIAPort.create({
    data: { name: name.trim(), code: code?.trim() || null, state: state?.trim() || null },
  });
  res.status(201).json({ success: true, data: item });
};

const updatePort = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, state, isActive } = req.body;
  const item = await prisma.pIAPort.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code?.trim() || null }),
      ...(state !== undefined && { state: state?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json({ success: true, data: item });
};

const deletePort = async (req: Request, res: Response) => {
  await prisma.pIAPort.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

// ─── Fee Config ─────────────────────────────────────────────────────────────

const listFeeConfig = async (_req: Request, res: Response) => {
  const items = await prisma.pIAFeeConfig.findMany({ orderBy: { feeType: 'asc' } });
  res.json({ success: true, data: items });
};

const upsertFeeConfig = async (req: Request, res: Response): Promise<void> => {
  const { feeType, label, amount, description, isActive } = req.body;
  if (!feeType || amount === undefined) {
    res.status(400).json({ success: false, message: 'feeType and amount are required' }); return;
  }
  const item = await prisma.pIAFeeConfig.upsert({
    where: { feeType },
    create: { feeType, label: label || feeType, amount, description: description || null, isActive: isActive ?? true },
    update: {
      ...(label !== undefined && { label }),
      ...(amount !== undefined && { amount }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json({ success: true, data: item });
};

// ─── Document Checklist ──────────────────────────────────────────────────────

const listDocumentChecklist = async (req: Request, res: Response) => {
  const { subType } = req.query;
  const items = await prisma.pIADocumentChecklist.findMany({
    where: subType ? { subType: subType as any } : undefined,
    orderBy: [{ subType: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json({ success: true, data: items });
};

const createDocumentChecklist = async (req: Request, res: Response): Promise<void> => {
  const { subType, documentType, documentLabel, description, isMandatory, sortOrder } = req.body;
  if (!subType || !documentType?.trim() || !documentLabel?.trim()) {
    res.status(400).json({ success: false, message: 'subType, documentType and documentLabel are required' }); return;
  }
  const item = await prisma.pIADocumentChecklist.create({
    data: {
      subType,
      documentType: documentType.trim(),
      documentLabel: documentLabel.trim(),
      description: description?.trim() || null,
      isMandatory: isMandatory ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });
  res.status(201).json({ success: true, data: item });
};

const updateDocumentChecklist = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { documentLabel, description, isMandatory, sortOrder, isActive } = req.body;
  const item = await prisma.pIADocumentChecklist.update({
    where: { id },
    data: {
      ...(documentLabel !== undefined && { documentLabel: documentLabel.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isMandatory !== undefined && { isMandatory }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  res.json({ success: true, data: item });
};

const deleteDocumentChecklist = async (req: Request, res: Response) => {
  await prisma.pIADocumentChecklist.delete({ where: { id: req.params.id } });
  res.json({ success: true });
};

export const piaMasterController = {
  listMinerals, createMineral, updateMineral, deleteMineral,
  listPorts, createPort, updatePort, deletePort,
  listFeeConfig, upsertFeeConfig,
  listDocumentChecklist, createDocumentChecklist, updateDocumentChecklist, deleteDocumentChecklist,
};
