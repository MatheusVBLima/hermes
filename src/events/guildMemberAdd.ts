import { Events, GuildMember, TextChannel } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../services/database.js';
import { successEmbed } from '../utils/embeds.js';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember): Promise<void> {
    try {
        logger.info(`New member joined: ${member.user.tag} in ${member.guild.name}`);

        // Get guild configuration
        const guildConfig = await prisma.guild.findUnique({
            where: { id: member.guild.id },
            select: {
                welcomeChannelId: true,
                welcomeMessage: true,
            },
        });

        // If no welcome channel configured, skip
        if (!guildConfig?.welcomeChannelId) {
            logger.debug(`No welcome channel configured for ${member.guild.name}`);
            return;
        }

        // Get welcome channel
        const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId) as TextChannel;

        if (!welcomeChannel) {
            logger.warn(`Welcome channel ${guildConfig.welcomeChannelId} not found in ${member.guild.name}`);
            return;
        }

        // Build welcome message
        const defaultMessage = `Welcome to **${member.guild.name}**, {user}! 🎉\n\nYou are member **#{memberCount}**!`;
        const message = guildConfig.welcomeMessage || defaultMessage;

        // Replace placeholders
        const formattedMessage = message
            .replace(/{user}/g, member.toString())
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, member.guild.memberCount.toString());

        // Send welcome message
        const embed = successEmbed('Welcome!')
            .setDescription(formattedMessage)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `User ID: ${member.user.id}` })
            .setTimestamp();

        await welcomeChannel.send({ embeds: [embed] });

        logger.info(`Welcome message sent for ${member.user.tag} in ${member.guild.name}`);

    } catch (error) {
        logger.error('Error handling guildMemberAdd event:', error);
    }
}
