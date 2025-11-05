import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, time, TimestampStyles } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to get information about')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get target user (or the command user if no target specified)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = infoEmbed(`User Info: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
            {
                name: '👤 Username',
                value: targetUser.username,
                inline: true,
            },
            {
                name: '🔖 Discriminator',
                value: targetUser.discriminator,
                inline: true,
            },
            {
                name: '🆔 User ID',
                value: `\`${targetUser.id}\``,
                inline: true,
            },
            {
                name: '🤖 Bot',
                value: targetUser.bot ? 'Yes' : 'No',
                inline: true,
            },
            {
                name: '📅 Account Created',
                value: time(targetUser.createdAt, TimestampStyles.RelativeTime),
                inline: true,
            }
        );

    // Add server-specific info if user is a member
    if (member) {
        embed.addFields(
            {
                name: '📥 Joined Server',
                value: member.joinedAt ? time(member.joinedAt, TimestampStyles.RelativeTime) : 'Unknown',
                inline: true,
            },
            {
                name: '🎨 Nickname',
                value: member.nickname || 'None',
                inline: true,
            },
            {
                name: `📋 Roles [${member.roles.cache.size - 1}]`,
                value: getRolesList(member),
                inline: false,
            }
        );

        // Set color to highest role color
        if (member.displayHexColor !== '#000000') {
            embed.setColor(member.displayHexColor as any);
        }
    }

    // Add user banner if available
    try {
        const fetchedUser = await targetUser.fetch();
        if (fetchedUser.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ size: 1024 }) || '');
        }
    } catch (error) {
        // Banner fetch failed, continue without it
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * Gets formatted list of user roles
 */
function getRolesList(member: GuildMember): string {
    const roles = member.roles.cache
        .filter(role => role.id !== member.guild.id) // Filter @everyone role
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString());

    if (roles.length === 0) {
        return 'None';
    }

    // Limit to first 10 roles to avoid exceeding embed limits
    if (roles.length > 10) {
        const remaining = roles.length - 10;
        return roles.slice(0, 10).join(', ') + ` and ${remaining} more...`;
    }

    return roles.join(', ');
}
