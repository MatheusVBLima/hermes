import { Events, Message, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../services/database.js';
import { EmbedColors } from '../utils/embeds.js';

export const name = Events.MessageDelete;
export const once = false;

export async function execute(message: Message): Promise<void> {
    // Ignore DMs and partial messages
    if (!message.guild || message.partial) return;

    // Ignore bot messages
    if (message.author?.bot) return;

    try {
        // Get guild configuration
        const guildConfig = await prisma.guild.findUnique({
            where: { id: message.guild.id },
            select: { logChannelId: true },
        });

        // If no log channel configured, just log to console
        if (!guildConfig?.logChannelId) {
            logger.debug(`Message deleted in ${message.guild.name}: ${message.content?.substring(0, 50) || '[No content]'}`);
            return;
        }

        // Get log channel
        const logChannel = message.guild.channels.cache.get(guildConfig.logChannelId) as TextChannel;

        if (!logChannel) {
            logger.warn(`Log channel ${guildConfig.logChannelId} not found in ${message.guild.name}`);
            return;
        }

        // Build log embed
        const embed = new EmbedBuilder()
            .setColor(EmbedColors.ERROR)
            .setTitle('🗑️ Message Deleted')
            .setDescription(message.content || '*No text content*')
            .addFields(
                { name: 'Author', value: `${message.author?.tag || 'Unknown'} (${message.author?.id || 'Unknown'})`, inline: true },
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Message ID', value: message.id, inline: true }
            )
            .setTimestamp();

        // Add attachment info if any
        if (message.attachments.size > 0) {
            const attachmentList = message.attachments.map(att => `[${att.name}](${att.url})`).join('\n');
            embed.addFields({ name: 'Attachments', value: attachmentList, inline: false });
        }

        // Add embed info if any
        if (message.embeds.length > 0) {
            embed.addFields({ name: 'Embeds', value: `${message.embeds.length} embed(s)`, inline: true });
        }

        // Send to log channel
        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        logger.error('Error handling messageDelete event:', error);
    }
}
