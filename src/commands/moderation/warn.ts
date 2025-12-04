import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { moderationEmbed, errorEmbed, warningEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Advertir um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário que será advertido')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('reason')
            .setDescription('Motivo da advertência')
            .setRequired(true)
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
    const reason = interaction.options.getString('reason', true);

    // Check if target is the command user
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'You cannot warn yourself.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Check if target is a bot
    if (targetUser.bot) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'You cannot warn bots.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        // Ensure guild exists in database
        await ensureGuild(interaction.guild.id, interaction.guild.name);

        // Add warning to database
        const warning = await prisma.warning.create({
            data: {
                userId: targetUser.id,
                username: targetUser.tag,
                guildId: interaction.guild.id,
                moderatorId: interaction.user.id,
                moderator: interaction.user.tag,
                reason,
            },
        });

        // Log to moderation logs
        await prisma.modLog.create({
            data: {
                guildId: interaction.guild.id,
                action: 'warn',
                targetId: targetUser.id,
                targetTag: targetUser.tag,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
                metadata: JSON.stringify({ warningId: warning.id }),
            },
        });

        // Get total warnings for this user
        const totalWarnings = await prisma.warning.count({
            where: {
                userId: targetUser.id,
                guildId: interaction.guild.id,
            },
        });

        // Send DM to user (if possible)
        try {
            const dmEmbed = warningEmbed('You have been warned', `You have been warned in **${interaction.guild.name}**.`)
                .addFields(
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
                    { name: 'Reason', value: reason, inline: false }
                );

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            logger.debug(`Could not send DM to ${targetUser.tag}`);
        }

        // Send confirmation
        const embed = warningEmbed('User Warned')
            .setDescription(`**${targetUser.tag}** has been warned.`)
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Total Warnings', value: totalWarnings.toString(), inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

        // Add warning message if user has many warnings
        if (totalWarnings >= 3) {
            embed.setFooter({ text: `⚠️ This user has ${totalWarnings} warning(s). Consider further action.` });
        }

        await interaction.reply({ embeds: [embed] });

        logger.info(`User warned: ${targetUser.tag} by ${interaction.user.tag} in ${interaction.guild.name} (Total: ${totalWarnings})`);

    } catch (error) {
        logger.error('Error executing warn command:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to warn user. Please try again.')],
            flags: MessageFlags.Ephemeral,
        });
    }
}
