import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { moderationEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuário do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário que será banido')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('reason')
            .setDescription('Motivo do banimento')
            .setRequired(false)
    )
    .addIntegerOption(option =>
        option
            .setName('delete_days')
            .setDescription('Dias de mensagens a apagar (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'This command can only be used in a server.')],
            ephemeral: true,
        });
        return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    // Check if target is the command user
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'You cannot ban yourself.')],
            ephemeral: true,
        });
        return;
    }

    // Check if target is a bot
    if (targetUser.bot && targetUser.id === interaction.client.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'I cannot ban myself.')],
            ephemeral: true,
        });
        return;
    }

    try {
        // Try to get member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Check if member is bannable
        if (targetMember) {
            const executor = interaction.member as GuildMember;

            // Check role hierarchy
            if (targetMember.roles.highest.position >= executor.roles.highest.position) {
                await interaction.reply({
                    embeds: [errorEmbed('Error', 'You cannot ban this user due to role hierarchy.')],
                    ephemeral: true,
                });
                return;
            }

            // Check if bot can ban
            const botMember = await interaction.guild.members.fetchMe();
            if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
                await interaction.reply({
                    embeds: [errorEmbed('Error', 'I cannot ban this user due to role hierarchy.')],
                    ephemeral: true,
                });
                return;
            }

            if (!targetMember.bannable) {
                await interaction.reply({
                    embeds: [errorEmbed('Error', 'I cannot ban this user. They may have higher permissions.')],
                    ephemeral: true,
                });
                return;
            }
        }

        // Send DM to user before banning (if possible)
        try {
            const dmEmbed = moderationEmbed('You have been banned', {
                moderator: interaction.user.tag,
                reason,
            })
                .setDescription(`You have been banned from **${interaction.guild.name}**.`);

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            // User has DMs disabled or bot blocked
            logger.debug(`Could not send DM to ${targetUser.tag}`);
        }

        // Ban the user
        await interaction.guild.members.ban(targetUser, {
            reason: `${reason} | Banned by ${interaction.user.tag}`,
            deleteMessageSeconds: deleteDays * 24 * 60 * 60,
        });

        // Ensure guild exists in database
        await ensureGuild(interaction.guild.id, interaction.guild.name);

        // Log to database
        await prisma.modLog.create({
            data: {
                guildId: interaction.guild.id,
                action: 'ban',
                targetId: targetUser.id,
                targetTag: targetUser.tag,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                metadata: JSON.stringify({ deleteDays }),
            },
        });

        // Send confirmation
        const embed = successEmbed('User Banned')
            .setDescription(`**${targetUser.tag}** has been banned from the server.`)
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

        if (deleteDays > 0) {
            embed.addFields({ name: 'Messages Deleted', value: `${deleteDays} day(s)`, inline: true });
        }

        await interaction.reply({ embeds: [embed] });

        logger.info(`User banned: ${targetUser.tag} by ${interaction.user.tag} in ${interaction.guild.name}`);

    } catch (error) {
        logger.error('Error executing ban command:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to ban user. Please check my permissions and try again.')],
            ephemeral: true,
        });
    }
}
