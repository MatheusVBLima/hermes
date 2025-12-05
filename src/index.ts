import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './services/database.js';
import { createServer } from 'http';

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
                GatewayIntentBits.GuildMessageReactions,
            ],
            partials: [Partials.Message, Partials.Reaction, Partials.User],
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

            // Connect to database
            await connectDatabase();

            // Load commands and events
            await this.loadCommands();
            await this.loadEvents();

            // Start HTTP server for Render (required for free tier Web Services)
            // Must start BEFORE login to satisfy Render's port binding requirement
            this.startHealthServer();

            // Login to Discord
            logger.info('Logging in to Discord...');
            await this.client.login(config.discord.token);

        } catch (error) {
            logger.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    /**
     * Start a simple HTTP server for health checks (Render requirement)
     */
    private startHealthServer(): void {
        const PORT = process.env.PORT || 3000;

        const server = createServer((req, res) => {
            if (req.url === '/health' || req.url === '/') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    bot: this.client.user?.tag || 'Not logged in',
                    uptime: process.uptime(),
                    guilds: this.client.guilds.cache.size,
                    timestamp: new Date().toISOString()
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });

        server.listen(PORT, () => {
            logger.success(`Health server listening on port ${PORT}`);
        });
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(): Promise<void> {
        logger.info('Shutting down bot...');
        this.client.destroy();
        await disconnectDatabase();
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
    // Don't shutdown on unhandled rejection - log and continue
    // This prevents bot from crashing on minor errors
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception:', error);
    // Only shutdown on critical errors
    // Check if it's a critical error that requires shutdown
    if (error.message.includes('EADDRINUSE') || error.message.includes('ECONNREFUSED')) {
        logger.error('Critical error detected, shutting down...');
        bot.shutdown();
    } else {
        logger.warn('Non-critical error, continuing operation...');
    }
});
