import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: {
        cognitoId: cognitoId,
      },
      include: {
        favorites: true,
      },
    });
    if (!tenant) {
      res.status(404).json({ message: 'Tenant not found' });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ message: `Failed to get tenant: ${error.message}` });
    return;
  }
};

export const createTenant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;
    const tenant = await prisma.tenant.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving  tenant: ${error.message}` });
    return;
  }
};
