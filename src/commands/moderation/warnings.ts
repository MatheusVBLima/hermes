import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, time, TimestampStyles } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';

export const data = new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Ver advertências de um usuário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário para consultar advertências')
            .setRequired(true)
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

    try {
        // Get all warnings for the user in this guild
        const warnings = await prisma.warning.findMany({
            where: {
                userId: targetUser.id,
                guildId: interaction.guild.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (warnings.length === 0) {
            await interaction.reply({
                embeds: [infoEmbed('No Warnings', `**${targetUser.tag}** has no warnings in this server.`)],
                ephemeral: true,
            });
            return;
        }

        // Build embed
        const embed = infoEmbed(`Warnings for ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .setDescription(`**${warnings.length}** warning(s) found.`);

        // Add warning fields (limit to 10 most recent)
        const displayWarnings = warnings.slice(0, 10);

        displayWarnings.forEach((warning, index) => {
            const warningDate = time(warning.createdAt, TimestampStyles.RelativeTime);
            embed.addFields({
                name: `Warning #${warning.id} - ${warningDate}`,
                value: [
                    `**Moderator:** ${warning.moderator}`,
                    `**Reason:** ${warning.reason}`,
                ].join('\n'),
                inline: false,
            });
        });

        if (warnings.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${warnings.length} warnings` });
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to fetch warnings. Please try again.')],
            ephemeral: true,
        });
    }
}
