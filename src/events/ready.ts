import { Events, Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';
import { loadPendingReminders } from '../commands/utility/remind.js';
import { deployCommands } from '../deploy-commands.js';
import { config } from '../config/config.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client<true>): Promise<void> {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Bot is ready and serving ${client.guilds.cache.size} guild(s)`);
    logger.info(`Watching ${client.users.cache.size} user(s)`);

    // Set bot status
    client.user.setPresence({
        activities: [{
            name: '/help for commands',
            type: ActivityType.Listening,
        }],
        status: 'online',
    });

    logger.success('Bot presence set successfully');

    // Deploy commands if GUILD_ID is set (for instant registration in dev/test servers)
    if (config.discord.guildId) {
        try {
            logger.info('Auto-deploying commands to guild...');
            // Set --guild flag in process.argv so deployCommands uses guild deployment
            if (!process.argv.includes('--guild')) {
                process.argv.push('--guild');
            }
            await deployCommands();
        } catch (error) {
            logger.error('Failed to auto-deploy commands:', error);
        }
    }

    // Load pending reminders
    await loadPendingReminders();
}
