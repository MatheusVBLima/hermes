import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Bot Configuration
 * Centralizes all configuration values from environment variables
 */
export const config = {
    // Discord Configuration
    discord: {
        token: process.env.DISCORD_TOKEN || '',
        clientId: process.env.CLIENT_ID || '',
        guildId: process.env.GUILD_ID || '', // Optional: for faster guild-specific command deployment
    },

    // Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Bot Settings
    bot: {
        prefix: process.env.PREFIX || '!',
        ownerId: process.env.OWNER_ID || '',
    },

    // Database (for future phases)
    database: {
        url: process.env.DATABASE_URL || '',
    },

    // APIs (for future phases)
    apis: {
        openai: process.env.OPENAI_API_KEY || '',
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID || '',
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
        },
    },
} as const;

/**
 * Validates required configuration values
 * @throws Error if required values are missing
 */
export function validateConfig(): void {
    const required = [
        { key: 'DISCORD_TOKEN', value: config.discord.token },
        { key: 'CLIENT_ID', value: config.discord.clientId },
    ];

    const missing = required.filter(({ value }) => !value);

    if (missing.length > 0) {
        const keys = missing.map(({ key }) => key).join(', ');
        throw new Error(
            `Missing required environment variables: ${keys}\n` +
            'Please check your .env file and ensure all required variables are set.'
        );
    }
}
