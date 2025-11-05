import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extend Client type to include commands collection
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, any>;
    }
}

/**
 * Main Bot Client
 */
class HermesBot {
    public client: Client;
    public commands: Collection<string, any>;

    constructor() {
        // Validate configuration before starting
        try {
            validateConfig();
        } catch (error) {
            logger.error('Configuration validation failed:', error);
            process.exit(1);
        }

        // Initialize Discord client with required intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });

        this.commands = new Collection();
        this.client.commands = this.commands;
    }

    /**
     * Load all command files from commands directory
     */
    private async loadCommands(): Promise<void> {
        logger.info('Loading commands...');

        const commandsPath = join(__dirname, 'commands');
        const categories = readdirSync(commandsPath);

        let commandCount = 0;

        for (const category of categories) {
            const categoryPath = join(commandsPath, category);
            const commandFiles = readdirSync(categoryPath).filter(file =>
                file.endsWith('.ts') || file.endsWith('.js')
            );

            for (const file of commandFiles) {
                const filePath = join(categoryPath, file);
                const fileUrl = pathToFileURL(filePath).href;

                try {
                    const commandModule = await import(fileUrl);

                    if (!commandModule.data || !commandModule.execute) {
                        logger.warn(`Command at ${filePath} is missing required "data" or "execute" export`);
                        continue;
                    }

                    // Create command object with category
                    const command = {
                        ...commandModule,
                        category: category.charAt(0).toUpperCase() + category.slice(1),
                    };

                    this.commands.set(command.data.name, command);
                    commandCount++;
                    logger.debug(`Loaded command: ${command.data.name} (${category})`);
                } catch (error) {
                    logger.error(`Failed to load command at ${filePath}:`, error);
                }
            }
        }

        logger.success(`Loaded ${commandCount} command(s) from ${categories.length} categor(ies)`);
    }

    /**
     * Load all event files from events directory
     */
    private async loadEvents(): Promise<void> {
        logger.info('Loading events...');

        const eventsPath = join(__dirname, 'events');
        const eventFiles = readdirSync(eventsPath).filter(file =>
            file.endsWith('.ts') || file.endsWith('.js')
        );

        let eventCount = 0;

        for (const file of eventFiles) {
            const filePath = join(eventsPath, file);
            const fileUrl = pathToFileURL(filePath).href;

            try {
                const event = await import(fileUrl);

                if (!event.name || !event.execute) {
                    logger.warn(`Event at ${filePath} is missing required "name" or "execute" export`);
                    continue;
                }

                // Register event listener
                if (event.once) {
                    this.client.once(event.name, (...args) => event.execute(...args));
                } else {
                    this.client.on(event.name, (...args) => event.execute(...args));
                }

                eventCount++;
                logger.debug(`Loaded event: ${event.name} (${event.once ? 'once' : 'on'})`);
            } catch (error) {
                logger.error(`Failed to load event at ${filePath}:`, error);
            }
        }

        logger.success(`Loaded ${eventCount} event handler(s)`);
    }

    /**
     * Start the bot
     */
    public async start(): Promise<void> {
        try {
            logger.info('Starting Hermes Discord Bot...');

            // Load commands and events
            await this.loadCommands();
            await this.loadEvents();

            // Login to Discord
            logger.info('Logging in to Discord...');
            await this.client.login(config.discord.token);

        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(): Promise<void> {
        logger.info('Shutting down bot...');
        this.client.destroy();
        logger.success('Bot shut down successfully');
        process.exit(0);
    }
}

// Initialize and start bot
const bot = new HermesBot();
bot.start();

// Handle graceful shutdown
process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());

// Handle unhandled errors
process.on('unhandledRejection', (error: Error) => {
    logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    bot.shutdown();
});
