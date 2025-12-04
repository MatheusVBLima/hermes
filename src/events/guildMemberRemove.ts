import { Events, GuildMember, TextChannel, PartialGuildMember } from 'discord.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../services/database.js';
import { infoEmbed } from '../utils/embeds.js';
import { logMemberLeave } from '../services/LogService.js';

export const name = Events.GuildMemberRemove;
export const once = false;

export async function execute(member: GuildMember | PartialGuildMember): Promise<void> {
    try {
        // Fetch full member if partial
        if (member.partial) {
            try {
                await member.fetch();
            } catch (error) {
                logger.debug('Could not fetch partial member');
                return;
            }
        }

        logger.info(`Member left: ${member.user.tag} from ${member.guild.name}`);

        // Send log
        await logMemberLeave(member as GuildMember);

        // Get guild configuration
        const guildConfig = await prisma.guild.findUnique({
            where: { id: member.guild.id },
            select: {
                welcomeChannelId: true, // Using same channel for goodbye messages
            },
        });

        // If no channel configured, skip
        if (!guildConfig?.welcomeChannelId) {
            logger.debug(`No goodbye channel configured for ${member.guild.name}`);
            return;
        }

        // Get channel
        const goodbyeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId) as TextChannel;

        if (!goodbyeChannel) {
            logger.warn(`Goodbye channel ${guildConfig.welcomeChannelId} not found in ${member.guild.name}`);
            return;
        }

        // Send goodbye message
        const embed = infoEmbed('Goodbye')
            .setDescription(`**${member.user.tag}** has left the server. 👋`)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .addFields({
                name: 'Members Now',
                value: member.guild.memberCount.toString(),
                inline: true,
            })
            .setFooter({ text: `User ID: ${member.user.id}` })
            .setTimestamp()
            .setColor(0x95a5a6);

        await goodbyeChannel.send({ embeds: [embed] });

        logger.info(`Goodbye message sent for ${member.user.tag} in ${member.guild.name}`);

    } catch (error) {
        logger.error('Error handling guildMemberRemove event:', error);
    }
}
