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

    if (!agencyName?.trim()) {
      res.status(400).json({ success: false, message: 'Agency name is required' });
      return;
    }

    const appNo = await generateAppNo();

    const application = await prisma.application.create({
      data: {
        appNo,
        type: 'PIA',
        status: 'DRAFT',
        organisation: agencyName.trim(),
        applicantName: agencyName.trim(),
        userId,
        piaApplication: {
          create: { subType: subType as any, piaStatus: 'DRAFT' },
        },
      },
      include: { piaApplication: { include: { branches: true } } },
    });

    res.status(201).json({ success: true, data: application });
  } catch (err) { next(err); }
};

// PUT /pia/applications/:id — save Part I data
const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.application.findFirst({
      where: { id, userId, type: 'PIA' },
      include: { piaApplication: true },
    });
    if (!existing?.piaApplication) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }
    if (existing.status !== 'DRAFT') {
      res.status(400).json({ success: false, message: 'Only DRAFT applications can be edited' });
      return;
    }

    const {
      agencyName, agencyNameHindi,
      headOfficeAddress, headOfficeState, headOfficeDistrict,
      headOfficeCity, headOfficePincode, headOfficeCountry,
      headOfficePhone, headOfficeFax, headOfficeEmail,
      headOfOrgName, headOfOrgDesignation, headOfOrgContact,
      legalStatus, legalStatusDetails,
      inspectionDivHeadName, inspectionDivHeadDesignation, inspectionDivPhone, inspectionDivEmail,
      labDivHeadName, labDivHeadDesignation, labDivPhone, labDivEmail,
      branches,
    } = req.body;

    const piaId = existing.piaApplication.id;

    await prisma.$transaction(async (tx) => {
      if (agencyName?.trim()) {
        await tx.application.update({
          where: { id },
          data: { organisation: agencyName.trim(), applicantName: agencyName.trim() },
        });
      }

      await tx.pIAApplication.update({
        where: { id: piaId },
        data: {
          agencyNameHindi:               agencyNameHindi?.trim()               || null,
          headOfficeAddress:             headOfficeAddress?.trim()             || null,
          headOfficeState:               headOfficeState                       || null,
          headOfficeDistrict:            headOfficeDistrict?.trim()            || null,
          headOfficeCity:                headOfficeCity?.trim()                || null,
          headOfficePincode:             headOfficePincode?.trim()             || null,
          headOfficeCountry:             headOfficeCountry                     || 'India',
          headOfficePhone:               headOfficePhone?.trim()               || null,
          headOfficeFax:                 headOfficeFax?.trim()                 || null,
          headOfficeEmail:               headOfficeEmail?.trim()               || null,
          headOfOrgName:                 headOfOrgName?.trim()                 || null,
          headOfOrgDesignation:          headOfOrgDesignation?.trim()          || null,
          headOfOrgContact:              headOfOrgContact?.trim()              || null,
          legalStatus:                   legalStatus                           || null,
          legalStatusDetails:            legalStatusDetails?.trim()            || null,
          inspectionDivHeadName:         inspectionDivHeadName?.trim()         || null,
          inspectionDivHeadDesignation:  inspectionDivHeadDesignation?.trim()  || null,
          inspectionDivPhone:            inspectionDivPhone?.trim()            || null,
          inspectionDivEmail:            inspectionDivEmail?.trim()            || null,
          labDivHeadName:                labDivHeadName?.trim()                || null,
          labDivHeadDesignation:         labDivHeadDesignation?.trim()         || null,
          labDivPhone:                   labDivPhone?.trim()                   || null,
          labDivEmail:                   labDivEmail?.trim()                   || null,
        },
      });

      if (Array.isArray(branches)) {
        await tx.pIABranch.deleteMany({ where: { piaApplicationId: piaId } });
        if (branches.length > 0) {
          await tx.pIABranch.createMany({
            data: branches.map((b: any) => ({
              piaApplicationId: piaId,
              branchName:              b.branchName?.trim()              || 'Branch',
              address:                 b.address?.trim()                 || null,
              state:                   b.state                           || null,
              district:                b.district?.trim()                || null,
              city:                    b.city?.trim()                    || null,
              pincode:                 b.pincode?.trim()                 || null,
              phone:                   b.phone?.trim()                   || null,
              email:                   b.email?.trim()                   || null,
              headOfBranchName:        b.headOfBranchName?.trim()        || null,
              headOfBranchDesignation: b.headOfBranchDesignation?.trim() || null,
            })),
          });
        }
      }
    });

    const result = await prisma.application.findUnique({
      where: { id },
      include: { piaApplication: { include: { branches: true } } },
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// GET /pia/applications — list authenticated user's PIA apps
const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const apps = await prisma.application.findMany({
      where: { userId, type: 'PIA' },
      include: {
        piaApplication: { select: { id: true, subType: true, piaStatus: true, updatedAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: apps });
  } catch (err) { next(err); }
};

// GET /pia/applications/:id — get single application with Part I + branches
const getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const app = await prisma.application.findFirst({
      where: { id: req.params.id, userId, type: 'PIA' },
      include: { piaApplication: { include: { branches: true } } },
    });
    if (!app) { res.status(404).json({ success: false, message: 'Not found' }); return; }
    res.json({ success: true, data: app });
  } catch (err) { next(err); }
};

export const piaApplicationController = { create, update, list, getById };
