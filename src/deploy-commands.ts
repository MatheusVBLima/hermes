import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config, validateConfig } from './config/config.js';
import { logger } from './utils/logger.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Command Deployment Script
 * Registers slash commands with Discord API
 */
async function deployCommands(): Promise<void> {
    try {
        // Validate configuration
        validateConfig();

        logger.info('Starting command deployment...');

        // Collect all command data
        const commands: any[] = [];
        const commandsPath = join(__dirname, 'commands');
        const categories = readdirSync(commandsPath);

        for (const category of categories) {
            const categoryPath = join(commandsPath, category);
            const commandFiles = readdirSync(categoryPath).filter(file =>
                file.endsWith('.ts') || file.endsWith('.js')
            );

            for (const file of commandFiles) {
                const filePath = join(categoryPath, file);
                const fileUrl = pathToFileURL(filePath).href;

                try {
                    const command = await import(fileUrl);

                    if (!command.data) {
                        logger.warn(`Command at ${filePath} is missing "data" export`);
                        continue;
                    }

                    commands.push(command.data.toJSON());
                    logger.debug(`Added command: ${command.data.name}`);
                } catch (error) {
                    logger.error(`Failed to load command at ${filePath}:`, error);
                }
            }
        }

        logger.info(`Collected ${commands.length} command(s) for deployment`);

        // Initialize REST client
        const rest = new REST({ version: '10' }).setToken(config.discord.token);

        // Check if deploying to specific guild or globally
        const isGuildDeploy = process.argv.includes('--guild') && config.discord.guildId;

        if (isGuildDeploy) {
            // Deploy to specific guild (faster for development)
            logger.info(`Deploying commands to guild ${config.discord.guildId}...`);

            await rest.put(
                Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
                { body: commands }
            );

            logger.success(`Successfully deployed ${commands.length} command(s) to guild ${config.discord.guildId}`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            logger.info('Deploying commands globally...');
            logger.warn('Global deployment can take up to 1 hour to propagate across all servers');

            await rest.put(
                Routes.applicationCommands(config.discord.clientId),
                { body: commands }
            );

            logger.success(`Successfully deployed ${commands.length} command(s) globally`);
        }

        // Display deployed commands
        logger.info('Deployed commands:');
        commands.forEach(cmd => {
            logger.info(`  • /${cmd.name} - ${cmd.description}`);
        });

    } catch (error) {
        logger.error('Command deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
deployCommands();
