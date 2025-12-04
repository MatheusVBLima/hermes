import { Events, Message } from 'discord.js';
import { logger } from '../utils/logger.js';
import { logMessageDelete } from '../services/LogService.js';

export const name = Events.MessageDelete;
export const once = false;

export async function execute(message: Message): Promise<void> {
    // Ignore DMs and partial messages
    if (!message.guild || message.partial) return;

    // Ignore bot messages
    if (message.author?.bot) return;

    try {
        await logMessageDelete(message);
        logger.debug(`Message deleted in ${message.guild.name}: ${message.content?.substring(0, 50) || '[No content]'}`);
    } catch (error) {
        logger.error('Error handling messageDelete event:', error);
    }
}
