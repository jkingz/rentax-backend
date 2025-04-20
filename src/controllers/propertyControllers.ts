import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Location, Prisma, PrismaClient } from '@prisma/client';
import { wktToGeoJSON } from '@terraformer/wkt';
import axios from 'axios';
import { Request, Response } from 'express';
import logger from '../config/logger';
import { PropertyWithLocation } from '@/types';

const prisma = new PrismaClient();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const getProperties = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    logger.info('Fetching properties with filters', { query: req.query });
    const {
      favoriteIds,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      latitude,
      longitude,
    } = req.query;

    // Build the WHERE conditions based on the query parameters
    let whereConditions: Prisma.Sql[] = [];

    // Add the favorite IDs condition
    if (favoriteIds) {
      const favoriteIdsArray = (favoriteIds as string).split(',').map(Number);
      whereConditions.push(
        Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`,
      );
    }

    // Add the price min condition
    if (priceMin) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" >= ${Number(priceMin)}`,
      );
    }

    // Add the price max condition
    if (priceMax) {
      whereConditions.push(
        Prisma.sql`p."pricePerMonth" <= ${Number(priceMax)}`,
      );
    }

    // Add the beds condition
    if (beds && beds !== 'any') {
      whereConditions.push(Prisma.sql`p.beds >= ${Number(beds)}`);
    }

    // Add the baths condition
    if (baths && baths !== 'any') {
      whereConditions.push(Prisma.sql`p.baths >= ${Number(baths)}`);
    }

    // Add the square feet min condition
    if (squareFeetMin) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" >= ${Number(squareFeetMin)}`,
      );
    }

    // Add the square feet max condition
    if (squareFeetMax) {
      whereConditions.push(
        Prisma.sql`p."squareFeet" <= ${Number(squareFeetMax)}`,
      );
    }

    // Add the property type condition
    if (propertyType && propertyType !== 'any') {
      whereConditions.push(
        Prisma.sql`p."propertyType" = ${propertyType}::"PropertyType"`,
      );
    }

    // Add the amenities condition
    if (amenities && amenities !== 'any') {
      const amenitiesArray = (amenities as string).split(',');
      whereConditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`);
    }

    // Add the availability condition
    if (availableFrom && availableFrom !== 'any') {
      const availableFromDate =
        typeof availableFrom === 'string' ? availableFrom : null;
      if (availableFromDate) {
        const date = new Date(availableFromDate);
        if (!isNaN(date.getTime())) {
          whereConditions.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM "Lease" l
              WHERE l."propertyId" = p.id
              AND l."startDate" <= ${date.toISOString()}
            )`,
          );
        }
      }
    }

    // Add the location condition
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusInKilometers = 1000;
      const degrees = radiusInKilometers / 111; // Converts kilometers to degrees

      whereConditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
        )`,
      );
    }

    // Construct the complete query with the WHERE conditions
    // and the location condition
    const completeQuery = Prisma.sql`
      SELECT
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, ' AND ')}`
          : Prisma.empty
      }
    `;

    // Execute the query using Prisma
    const properties = await prisma.$queryRaw<PropertyWithLocation[]>(completeQuery);
    logger.info(`Successfully retrieved ${properties.length} properties`);
    res.json(properties);
  } catch (error: any) {
    logger.error('Failed to retrieve properties:', {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: `Error retrieving properties: ${error.message}` });
  }
};

export const getProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  try {
    logger.info(`Fetching property details`, { propertyId: id });

    const property = await prisma.property.findUnique({
      where: { id: Number(id) },
      include: {
        location: true,
      },
    });

    if (!property) {
      logger.warn('Property not found', { propertyId: id });
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const coordinates: { coordinates: string }[] =
      await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

    const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || '');
    const propertyWithCoordinates = {
      ...property,
      location: {
        ...property.location,
        coordinates: {
          longitude: geoJSON.coordinates[0],
          latitude: geoJSON.coordinates[1],
        },
      },
    };

    logger.info('Successfully retrieved property details', { propertyId: id });
    res.json(propertyWithCoordinates);
  } catch (err: any) {
    logger.error('Failed to retrieve property:', {
      propertyId: id,
      error: err.message,
      stack: err.stack,
    });
    res
      .status(500)
      .json({ message: `Error retrieving property: ${err.message}` });
  }
};

export const createProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      managerCognitoId,
      ...propertyData
    } = req.body;

    logger.info('Creating new property', {
      managerCognitoId,
      address,
      filesCount: files.length,
    });

    // Upload photos to S3
    logger.info('Uploading property photos to S3');
    const photoUrls = await Promise.all(
      files.map(async (file) => {
        const key = `properties/${Date.now()}-${file.originalname}`;
        const uploadParams = {
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        logger.debug('Uploading file to S3', {
          filename: file.originalname,
          key,
        });
        const uploadResult = await new Upload({
          client: s3Client,
          params: uploadParams,
        }).done();

        return uploadResult.Location;
      }),
    );
    logger.info(`Successfully uploaded ${photoUrls.length} photos`);

    // Geocode address
    logger.info('Geocoding property address');
    const geocodingUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        street: address,
        city,
        country,
        postalcode: postalCode,
        format: 'json',
        limit: '1',
      },
    ).toString()}`;

    const geocodingResponse = await axios.get(geocodingUrl, {
      headers: {
        'User-Agent': 'RealEstateApp (justsomedummyemail@gmail.com)',
      },
    });

    const [longitude, latitude] = geocodingResponse.data[0]
      ? [
          parseFloat(geocodingResponse.data[0].lon),
          parseFloat(geocodingResponse.data[0].lat),
        ]
      : [0, 0];

    logger.info('Creating location record');
    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326))
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    logger.info('Creating property record');
    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId,
        amenities:
          typeof propertyData.amenities === 'string'
            ? propertyData.amenities.split(',')
            : [],
        highlights:
          typeof propertyData.highlights === 'string'
            ? propertyData.highlights.split(',')
            : [],
        isPetsAllowed: propertyData.isPetsAllowed === 'true',
        isParkingIncluded: propertyData.isParkingIncluded === 'true',
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    logger.info('Successfully created new property', {
      propertyId: newProperty.id,
      managerId: managerCognitoId,
    });
    res.status(201).json(newProperty);
  } catch (err: any) {
    logger.error('Failed to create property:', {
      error: err.message,
      stack: err.stack,
      managerCognitoId: req.body.managerCognitoId,
    });
    res
      .status(500)
      .json({ message: `Error creating property: ${err.message}` });
  }
};
