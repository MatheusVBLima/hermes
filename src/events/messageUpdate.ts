import { Events, Message, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../services/database.js';
import { EmbedColors } from '../utils/embeds.js';

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
        // Get guild configuration
        const guildConfig = await prisma.guild.findUnique({
            where: { id: newMessage.guild.id },
            select: { logChannelId: true },
        });

        // If no log channel configured, just log to console
        if (!guildConfig?.logChannelId) {
            logger.debug(`Message edited in ${newMessage.guild.name}`);
            return;
        }

        // Get log channel
        const logChannel = newMessage.guild.channels.cache.get(guildConfig.logChannelId) as TextChannel;

        if (!logChannel) {
            logger.warn(`Log channel ${guildConfig.logChannelId} not found in ${newMessage.guild.name}`);
            return;
        }

        // Build log embed
        const embed = new EmbedBuilder()
            .setColor(EmbedColors.WARNING)
            .setTitle('✏️ Message Edited')
            .addFields(
                { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
                { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: 'Message ID', value: newMessage.id, inline: true }
            )
            .setTimestamp();

        // Add before/after content
        const oldContent = oldMessage.content || '*No text content*';
        const newContent = newMessage.content || '*No text content*';

        // Truncate if too long
        embed.addFields(
            {
                name: 'Before',
                value: oldContent.length > 1024 ? oldContent.substring(0, 1021) + '...' : oldContent,
                inline: false
            },
            {
                name: 'After',
                value: newContent.length > 1024 ? newContent.substring(0, 1021) + '...' : newContent,
                inline: false
            }
        );

        // Add link to message
        embed.addFields({
            name: 'Jump to Message',
            value: `[Click here](${newMessage.url})`,
            inline: false,
        });

        // Send to log channel
        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        logger.error('Error handling messageUpdate event:', error);
    }
}
