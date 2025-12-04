import { Events, Message } from 'discord.js';
import { logger } from '../utils/logger.js';
import { logMessageEdit } from '../services/LogService.js';

export const name = Events.MessageUpdate;
export const once = false;

export async function execute(oldMessage: Message, newMessage: Message): Promise<void> {
    // Ignore DMs and partial messages
    if (!newMessage.guild || newMessage.partial || oldMessage.partial) return;

    // Ignore bot messages
    if (newMessage.author?.bot) return;

    // Ignore if content hasn't changed (e.g., embed updates)
    if (oldMessage.content === newMessage.content) return;

    try {
        await logMessageEdit(oldMessage, newMessage);
        logger.debug(`Message edited in ${newMessage.guild.name}`);
    } catch (error) {
        logger.error('Error handling messageUpdate event:', error);
    }
}
