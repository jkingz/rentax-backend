import { PrismaClient } from '@prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import { Request, Response } from 'express';
import logger from '../config/logger';

const prisma = new PrismaClient();

export const getManager = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    logger.info(`Fetching manager with cognitoId: ${cognitoId}`);
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
    logger.error('Failed to get manager:', { error: error.message, cognitoId: req.params.cognitoId });
    res.status(500).json({ message: `Failed to get manager: ${error.message}` });
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
    logger.info(`Updating manager with cognitoId: ${cognitoId}`);
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
    logger.error('Failed to update manager:', {
      error: error.message,
      cognitoId: req.params.cognitoId,
      updates: req.body
    });
    res.status(500).json({ message: `Failed to update manager: ${error.message}` });
    return;
  }
};

export const getManagerProperties = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    logger.info(`Fetching properties for manager: ${cognitoId}`);

    // check if manager exists
    const manager = await prisma.manager.findUnique({
      where: { cognitoId: cognitoId },
    });

    if (!manager) {
      logger.warn(`Manager not found: ${cognitoId}`);
      res.status(404).json({ message: 'manager not found' });
      return;
    }

    // get properties
    const properties = await prisma.property.findMany({
      where: { managerCognitoId: cognitoId },
      include: { location: true },
    });

    logger.info(`Found ${properties.length} properties for manager ${cognitoId}`);

    // add coordinates to properties
    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || '');
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: { longitude, latitude },
          },
        };
      }),
    );

    logger.info(`Successfully formatted ${propertiesWithFormattedLocation.length} properties`);
    res.json(propertiesWithFormattedLocation);
  } catch (err: any) {
    logger.error('Error in getManagerProperties:', {
      error: err.message,
      stack: err.stack,
      cognitoId: req.params.cognitoId
    });
    res.status(500).json({ message: `Error retrieving manager property: ${err.message}` });
  }
};
