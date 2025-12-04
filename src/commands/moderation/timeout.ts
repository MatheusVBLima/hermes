import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { moderationEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silenciar temporariamente um usuário (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário que receberá timeout')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName('duration')
            .setDescription('Duração em minutos (1-40320 = até 28 dias)')
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('reason')
            .setDescription('Motivo do timeout')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const durationMinutes = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Convert minutes to milliseconds
    const durationMs = durationMinutes * 60 * 1000;

    // Check if target is the command user
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'You cannot timeout yourself.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Check if target is a bot
    if (targetUser.bot && targetUser.id === interaction.client.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'I cannot timeout myself.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        // Get member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'User is not in this server.')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const executor = interaction.member as GuildMember;

        // Check role hierarchy
        if (targetMember.roles.highest.position >= executor.roles.highest.position) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'You cannot timeout this user due to role hierarchy.')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Check if bot can timeout
        const botMember = await interaction.guild.members.fetchMe();
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'I cannot timeout this user due to role hierarchy.')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        if (!targetMember.moderatable) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'I cannot timeout this user. They may have higher permissions.')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Send DM to user before timeout (if possible)
        try {
            const dmEmbed = moderationEmbed('You have been timed out', {
                moderator: interaction.user.tag,
                reason,
                duration: formatDuration(durationMinutes),
            })
                .setDescription(`You have been timed out in **${interaction.guild.name}**.`);

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            logger.debug(`Could not send DM to ${targetUser.tag}`);
        }

        // Timeout the user
        await targetMember.timeout(durationMs, `${reason} | Timed out by ${interaction.user.tag}`);

        // Ensure guild exists in database
        await ensureGuild(interaction.guild.id, interaction.guild.name);

        // Log to database
        await prisma.modLog.create({
            data: {
                guildId: interaction.guild.id,
                action: 'timeout',
                targetId: targetUser.id,
                targetTag: targetUser.tag,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                duration: `${durationMinutes} minutes`,
            },
        });

        // Send confirmation
        const embed = successEmbed('User Timed Out')
            .setDescription(`**${targetUser.tag}** has been timed out.`)
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Duration', value: formatDuration(durationMinutes), inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

        await interaction.reply({ embeds: [embed] });

        logger.info(`User timed out: ${targetUser.tag} for ${durationMinutes}m by ${interaction.user.tag} in ${interaction.guild.name}`);

    } catch (error) {
        logger.error('Error executing timeout command:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to timeout user. Please check my permissions and try again.')],
            flags: MessageFlags.Ephemeral,
        });
    }
}

/**
 * Format duration in minutes to readable string
 */
function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours < 24) {
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        return `${hours}h ${remainingMinutes}m`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (remainingHours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days}d ${remainingHours}h`;
}
