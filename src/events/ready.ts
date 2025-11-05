import { Events, Client, ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>): void {
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
}
