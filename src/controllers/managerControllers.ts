import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export const getManager = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const manager = await prisma.manager.findUnique({
      where: {
        cognitoId: cognitoId,
      },
    });
    if (!manager) {
      res.status(404).json({ message: 'manager not found' });
      return;
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Failed to get manager: ${error.message}` });
    return;
  }
};

export const createManager = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;
    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(manager);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving  manager: ${error.message}` });
    return;
  }
};
