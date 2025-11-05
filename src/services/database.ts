import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Database Service
 * Manages Prisma Client connection and provides database utilities
 */

// Prevent multiple Prisma instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
    try {
        await prisma.$connect();
        logger.success('Database connected successfully');
    } catch (error) {
        logger.error('Failed to connect to database:', error);
        throw error;
    }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
    try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
    } catch (error) {
        logger.error('Error disconnecting from database:', error);
    }
}

/**
 * Ensure guild exists in database
 */
export async function ensureGuild(guildId: string, guildName: string): Promise<void> {
    try {
        await prisma.guild.upsert({
            where: { id: guildId },
            update: { name: guildName },
            create: {
                id: guildId,
                name: guildName,
            },
        });
    } catch (error) {
        logger.error(`Failed to ensure guild ${guildId}:`, error);
    }
}
