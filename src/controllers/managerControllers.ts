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
    res.status(200).json(manager);
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

export const updateManager = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;
    const updateManager = await prisma.manager.update({
      where: {
        cognitoId: cognitoId,
      },
      data: {
        name,
        email,
        phoneNumber,
      },
    });
    res.status(200).json(updateManager);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Failed to update manager: ${error.message}` });
    return;
  }
};
