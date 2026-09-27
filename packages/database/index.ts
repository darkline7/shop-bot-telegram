import path from 'node:path'; import dotenv from 'dotenv'; dotenv.config({path:path.resolve(__dirname,'../../.env')});

import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
export * from '@prisma/client';
