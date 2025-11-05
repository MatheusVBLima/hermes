import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

/**
 * Command structure
 */
export interface Command {
    data: SlashCommandBuilder;
    category?: string;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

/**
 * Event structure
 */
export interface Event {
    name: string;
    once: boolean;
    execute: (...args: any[]) => void | Promise<void>;
}

/**
 * Bot configuration
 */
export interface BotConfig {
    discord: {
        token: string;
        clientId: string;
        guildId: string;
    };
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    bot: {
        prefix: string;
        ownerId: string;
    };
    database: {
        url: string;
    };
    apis: {
        openai: string;
        spotify: {
            clientId: string;
            clientSecret: string;
        };
    };
}
