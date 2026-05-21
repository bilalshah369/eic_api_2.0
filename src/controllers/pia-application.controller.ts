import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

async function generateAppNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PIA/${year}/`;
  const count = await prisma.application.count({ where: { type: 'PIA' } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

// POST /pia/applications — create new draft
const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { subType = 'NEW_RECOGNITION', agencyName } = req.body;
    if (!agencyName?.trim()) { res.status(400).json({ success: false, message: 'Agency name is required' }); return; }

    const appNo = await generateAppNo();
    const application = await prisma.application.create({
      data: {
        appNo, type: 'PIA', status: 'DRAFT',
        organisation: agencyName.trim(), applicantName: agencyName.trim(), userId,
        piaApplication: { create: { subType: subType as any, piaStatus: 'DRAFT' } },
      },
      include: { piaApplication: { include: { branches: true, ports: { include: { port: true } }, scopes: { include: { mineralOre: true } }, inspectionManpower: true, labManpower: true, labEquipment: true, labProducts: true } } },
    });
    res.status(201).json({ success: true, data: application });
  } catch (err) { next(err); }
};

// PUT /pia/applications/:id — save Part I data
const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const existing = await prisma.application.findFirst({ where: { id, userId, type: 'PIA' }, include: { piaApplication: true } });
    if (!existing?.piaApplication) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
    if (existing.status !== 'DRAFT') { res.status(400).json({ success: false, message: 'Only DRAFT applications can be edited' }); return; }

    const {
      agencyName, agencyNameHindi,
      headOfficeAddress, headOfficeState, headOfficeDistrict, headOfficeCity, headOfficePincode, headOfficeCountry,
      headOfficePhone, headOfficeFax, headOfficeEmail,
      headOfOrgName, headOfOrgDesignation, headOfOrgContact,
      legalStatus, legalStatusDetails,
      inspectionDivHeadName, inspectionDivHeadDesignation, inspectionDivPhone, inspectionDivFax, inspectionDivEmail,
      labDivHeadName, labDivHeadDesignation, labDivPhone, labDivFax, labDivEmail,
      recognitionValidityDate, recognitionPeriod, existingRecognitionNo,
      hasCriminalProceedings, criminalProceedingsDetails,
      branches, mineralScopes,
    } = req.body;

    const piaId = existing.piaApplication.id;
    await prisma.$transaction(async (tx) => {
      if (agencyName?.trim()) {
        await tx.application.update({ where: { id }, data: { organisation: agencyName.trim(), applicantName: agencyName.trim() } });
      }
      await tx.pIAApplication.update({
        where: { id: piaId },
        data: {
          agencyNameHindi: agencyNameHindi?.trim() || null,
          headOfficeAddress: headOfficeAddress?.trim() || null, headOfficeState: headOfficeState || null,
          headOfficeDistrict: headOfficeDistrict?.trim() || null, headOfficeCity: headOfficeCity?.trim() || null,
          headOfficePincode: headOfficePincode?.trim() || null, headOfficeCountry: headOfficeCountry || 'India',
          headOfficePhone: headOfficePhone?.trim() || null, headOfficeFax: headOfficeFax?.trim() || null,
          headOfficeEmail: headOfficeEmail?.trim() || null,
          headOfOrgName: headOfOrgName?.trim() || null, headOfOrgDesignation: headOfOrgDesignation?.trim() || null,
          headOfOrgContact: headOfOrgContact?.trim() || null,
          legalStatus: legalStatus || null, legalStatusDetails: legalStatusDetails?.trim() || null,
          inspectionDivHeadName: inspectionDivHeadName?.trim() || null, inspectionDivHeadDesignation: inspectionDivHeadDesignation?.trim() || null,
          inspectionDivPhone: inspectionDivPhone?.trim() || null, inspectionDivFax: inspectionDivFax?.trim() || null, inspectionDivEmail: inspectionDivEmail?.trim() || null,
          labDivHeadName: labDivHeadName?.trim() || null, labDivHeadDesignation: labDivHeadDesignation?.trim() || null,
          labDivPhone: labDivPhone?.trim() || null, labDivFax: labDivFax?.trim() || null, labDivEmail: labDivEmail?.trim() || null,
          ...(recognitionValidityDate ? { recognitionValidityDate: new Date(recognitionValidityDate) } : { recognitionValidityDate: null }),
          ...(recognitionPeriod != null ? { recognitionPeriod: Number(recognitionPeriod) } : {}),
          existingRecognitionNo: existingRecognitionNo?.trim() || null,
          hasCriminalProceedings: hasCriminalProceedings ?? false,
          criminalProceedingsDetails: hasCriminalProceedings ? (criminalProceedingsDetails?.trim() || null) : null,
        },
      });
      if (Array.isArray(branches)) {
        await tx.pIABranch.deleteMany({ where: { piaApplicationId: piaId } });
        if (branches.length > 0) {
          await tx.pIABranch.createMany({
            data: branches.map((b: any) => ({
              piaApplicationId: piaId,
              branchName: b.branchName?.trim() || 'Branch', address: b.address?.trim() || null,
              state: b.state || null, district: b.district?.trim() || null, city: b.city?.trim() || null,
              pincode: b.pincode?.trim() || null, phone: b.phone?.trim() || null, fax: b.fax?.trim() || null, email: b.email?.trim() || null,
              headOfBranchName: b.headOfBranchName?.trim() || null, headOfBranchDesignation: b.headOfBranchDesignation?.trim() || null,
            })),
          });
        }
      }
      if (Array.isArray(mineralScopes)) {
        await tx.pIAApplicationScope.deleteMany({ where: { piaApplicationId: piaId } });
        if (mineralScopes.length > 0) {
          await tx.pIAApplicationScope.createMany({
            data: mineralScopes.map((s: any) => ({
              piaApplicationId: piaId,
              mineralOreId: s.mineralOreId,
              specifications: s.specifications?.trim() || null,
            })),
          });
        }
      }
    });

    const result = await getFullApplication(id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// PUT /pia/applications/:id/part-ii — save Part II data (SRS §5.3)
const updatePartII = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const existing = await prisma.application.findFirst({ where: { id, userId, type: 'PIA' }, include: { piaApplication: true } });
    if (!existing?.piaApplication) { res.status(404).json({ success: false, message: 'Application not found' }); return; }
    if (existing.status !== 'DRAFT') { res.status(400).json({ success: false, message: 'Only DRAFT applications can be edited' }); return; }

    const {
      // Inspection manpower counts
      seniorMgmtCount, inspectingStaffCount,
      // QMS
      qmsImplemented, qmsType,
      // Accreditation
      isAccredited, accreditationScope, accreditationBody, consultancyDetails,
      // Experience
      hasDomesticExperience, hasExportExperience,
      // Lab capability
      hasLaboratory, hasLabAccreditation, labAccreditationType, labAccreditationScope, labConsultancyDetails,
      // Declarations
      hasOtherActivities, otherActivitiesDetails,
      hasLinkedOrganization, linkedOrgDetails,
      hasRelatedActivities, relatedActivitiesDetails,
      hasDisputesWithClients, disputesDetails,
      hasCriminalProceedings, criminalProceedingsDetails,
      // Relations
      portIds,       // string[] — selected port IDs (first = default, BR-001)
      mineralScopes, // { mineralOreId: string, specifications?: string }[]
      manpower,      // { isSeniorMgmt, name, designation, qualification?, experienceYears?, specialization? }[]
      labManpower,   // { isSeniorMgmt, name, designation, qualification?, experienceYears? }[]
      labEquipment,  // { name, make?, model?, serialNo?, rangeCapacity?, calibrationDueDate? }[]
      labProducts,   // { productName, testParameters?, testMethods? }[]
    } = req.body;

    const piaId = existing.piaApplication.id;

    await prisma.$transaction(async (tx) => {
      await tx.pIAApplication.update({
        where: { id: piaId },
        data: {
          seniorMgmtCount:      seniorMgmtCount      != null ? Number(seniorMgmtCount)      : null,
          inspectingStaffCount: inspectingStaffCount  != null ? Number(inspectingStaffCount)  : null,
          qmsImplemented:       qmsImplemented        ?? false,
          qmsType:              qmsImplemented ? (qmsType || null) : null,
          isAccredited:         isAccredited           ?? false,
          accreditationScope:   accreditationScope?.trim()   || null,
          accreditationBody:    accreditationBody?.trim()    || null,
          consultancyDetails:   consultancyDetails?.trim()   || null,
          hasDomesticExperience: hasDomesticExperience ?? false,
          hasExportExperience:   hasExportExperience   ?? false,
          hasLaboratory:         hasLaboratory         ?? false,
          hasLabAccreditation:   hasLaboratory ? (hasLabAccreditation ?? false) : false,
          labAccreditationType:  hasLaboratory ? (labAccreditationType?.trim()  || null) : null,
          labAccreditationScope: hasLaboratory ? (labAccreditationScope?.trim() || null) : null,
          labConsultancyDetails: hasLaboratory ? (labConsultancyDetails?.trim() || null) : null,
          hasOtherActivities:       hasOtherActivities       ?? false,
          otherActivitiesDetails:   hasOtherActivities   ? (otherActivitiesDetails?.trim()   || null) : null,
          hasLinkedOrganization:    hasLinkedOrganization    ?? false,
          linkedOrgDetails:         hasLinkedOrganization ? (linkedOrgDetails?.trim()         || null) : null,
          hasRelatedActivities:     hasRelatedActivities     ?? false,
          relatedActivitiesDetails: hasRelatedActivities ? (relatedActivitiesDetails?.trim()  || null) : null,
          hasDisputesWithClients:   hasDisputesWithClients   ?? false,
          disputesDetails:          hasDisputesWithClients ? (disputesDetails?.trim()          || null) : null,
          hasCriminalProceedings:   hasCriminalProceedings   ?? false,
          criminalProceedingsDetails: hasCriminalProceedings ? (criminalProceedingsDetails?.trim() || null) : null,
        },
      });

      // Ports — BR-001: first port is default (no extra fee), rest incur additional fee (BR-002)
      if (Array.isArray(portIds)) {
        await tx.pIAApplicationPort.deleteMany({ where: { piaApplicationId: piaId } });
        if (portIds.length > 0) {
          await tx.pIAApplicationPort.createMany({
            data: portIds.map((portId: string, idx: number) => ({
              piaApplicationId: piaId, portId, isDefault: idx === 0,
            })),
          });
        }
      }

      // Mineral / Ore scopes
      if (Array.isArray(mineralScopes)) {
        await tx.pIAApplicationScope.deleteMany({ where: { piaApplicationId: piaId } });
        if (mineralScopes.length > 0) {
          await tx.pIAApplicationScope.createMany({
            data: mineralScopes.map((s: any) => ({
              piaApplicationId: piaId,
              mineralOreId: s.mineralOreId,
              specifications: s.specifications?.trim() || null,
            })),
          });
        }
      }

      // Inspection manpower (Annexure-4)
      if (Array.isArray(manpower)) {
        await tx.pIAManpower.deleteMany({ where: { piaApplicationId: piaId } });
        if (manpower.length > 0) {
          await tx.pIAManpower.createMany({
            data: manpower.map((m: any) => ({
              piaApplicationId: piaId,
              isSeniorMgmt:    m.isSeniorMgmt  ?? false,
              name:            m.name?.trim()  || 'Staff',
              designation:     m.designation?.trim() || '',
              qualification:   m.qualification?.trim() || null,
              experienceYears: m.experienceYears != null ? Number(m.experienceYears) : null,
              specialization:  m.specialization?.trim() || null,
            })),
          });
        }
      }

      // Lab manpower
      if (Array.isArray(labManpower)) {
        await tx.pIALabManpower.deleteMany({ where: { piaApplicationId: piaId } });
        if (labManpower.length > 0) {
          await tx.pIALabManpower.createMany({
            data: labManpower.map((m: any) => ({
              piaApplicationId: piaId,
              isSeniorMgmt:    m.isSeniorMgmt  ?? false,
              name:            m.name?.trim()  || 'Staff',
              designation:     m.designation?.trim() || '',
              qualification:   m.qualification?.trim() || null,
              experienceYears: m.experienceYears != null ? Number(m.experienceYears) : null,
            })),
          });
        }
      }

      // Lab equipment (Annexure-3)
      if (Array.isArray(labEquipment)) {
        await tx.pIALabEquipment.deleteMany({ where: { piaApplicationId: piaId } });
        if (labEquipment.length > 0) {
          await tx.pIALabEquipment.createMany({
            data: labEquipment.map((e: any) => ({
              piaApplicationId:   piaId,
              name:               e.name?.trim() || 'Equipment',
              make:               e.make?.trim() || null,
              model:              e.model?.trim() || null,
              serialNo:           e.serialNo?.trim() || null,
              rangeCapacity:      e.rangeCapacity?.trim() || null,
              calibrationDueDate: e.calibrationDueDate?.trim() || null,
            })),
          });
        }
      }

      // Lab products tested
      if (Array.isArray(labProducts)) {
        await tx.pIALabProduct.deleteMany({ where: { piaApplicationId: piaId } });
        if (labProducts.length > 0) {
          await tx.pIALabProduct.createMany({
            data: labProducts.map((p: any) => ({
              piaApplicationId: piaId,
              productName:      p.productName?.trim() || 'Product',
              testParameters:   p.testParameters?.trim() || null,
              testMethods:      p.testMethods?.trim() || null,
            })),
          });
        }
      }
    });

    const result = await getFullApplication(id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /pia/applications/:id — full application (Part I + II + all relations)
const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const app = await prisma.application.findFirst({
      where: { id: req.params.id, userId, type: 'PIA' },
      include: {
        piaApplication: {
          include: {
            branches: true,
            ports: { include: { port: true }, orderBy: { isDefault: 'desc' } },
            scopes: { include: { mineralOre: true } },
            inspectionManpower: { orderBy: { isSeniorMgmt: 'desc' } },
            labManpower: { orderBy: { isSeniorMgmt: 'desc' } },
            labEquipment: true,
            labProducts: true,
          },
        },
      },
    });
    if (!app) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: app });
  } catch (err) { next(err); }
};

// GET /pia/applications — list user's PIA apps
const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const apps = await prisma.application.findMany({
      where: { userId, type: 'PIA' },
      include: { piaApplication: { select: { id: true, subType: true, piaStatus: true, updatedAt: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: apps });
  } catch (err) { next(err); }
};

// GET /pia/masters/ports
const getMasterPorts = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ports = await prisma.pIAPort.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: ports });
  } catch (err) { next(err); }
};

// GET /pia/masters/minerals
const getMasterMinerals = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const minerals = await prisma.pIAMineralOre.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: minerals });
  } catch (err) { next(err); }
};

// ─── Internal helper ──────────────────────────────────────────────────────────
async function getFullApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      piaApplication: {
        include: {
          branches: true,
          ports: { include: { port: true }, orderBy: { isDefault: 'desc' } },
          scopes: { include: { mineralOre: true } },
          inspectionManpower: { orderBy: { isSeniorMgmt: 'desc' } },
          labManpower: { orderBy: { isSeniorMgmt: 'desc' } },
          labEquipment: true,
          labProducts: true,
        },
      },
    },
  });
}

export const piaApplicationController = {
  create, update, updatePartII,
  getById, list,
  getMasterPorts, getMasterMinerals,
};
