import { SlashCommandBuilder, ChatInputCommandInteraction, time, TimestampStyles, GuildVerificationLevel } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about this server');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({
            content: 'This command can only be used in a server.',
            ephemeral: true,
        });
        return;
    }

    // Fetch complete guild data for accurate counts
    await guild.fetch();

    // Get owner
    const owner = await guild.fetchOwner();

    // Get counts
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const totalChannels = textChannels + voiceChannels;

    // Get member stats
    const members = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = members - bots;

    // Get boost info
    const boostTier = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = infoEmbed(`Server Info: ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }) || '')
        .addFields(
            {
                name: '👑 Owner',
                value: `${owner.user.tag}`,
                inline: true,
            },
            {
                name: '🆔 Server ID',
                value: `\`${guild.id}\``,
                inline: true,
            },
            {
                name: '📅 Created',
                value: time(guild.createdAt, TimestampStyles.RelativeTime),
                inline: true,
            },
            {
                name: '👥 Members',
                value: [
                    `Total: **${members}**`,
                    `Humans: **${humans}**`,
                    `Bots: **${bots}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '📺 Channels',
                value: [
                    `Total: **${totalChannels}**`,
                    `Text: **${textChannels}**`,
                    `Voice: **${voiceChannels}**`,
                    `Categories: **${categories}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '📋 Other',
                value: [
                    `Roles: **${guild.roles.cache.size}**`,
                    `Emojis: **${guild.emojis.cache.size}**`,
                    `Stickers: **${guild.stickers.cache.size}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔒 Verification Level',
                value: getVerificationLevel(guild.verificationLevel),
                inline: true,
            },
            {
                name: '💎 Boost Status',
                value: [
                    `Tier: **${boostTier}**`,
                    `Boosts: **${boostCount}**`,
                ].join('\n'),
                inline: true,
            }
        );

    // Add server banner if available
    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ size: 1024 }) || '');
    }

    // Add description if available
    if (guild.description) {
        embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * Converts verification level to readable format
 */
function getVerificationLevel(level: GuildVerificationLevel): string {
    const levels: Record<GuildVerificationLevel, string> = {
        [GuildVerificationLevel.None]: 'None',
        [GuildVerificationLevel.Low]: 'Low',
        [GuildVerificationLevel.Medium]: 'Medium',
        [GuildVerificationLevel.High]: 'High',
        [GuildVerificationLevel.VeryHigh]: 'Very High',
    };

    return levels[level] || 'Unknown';
}
