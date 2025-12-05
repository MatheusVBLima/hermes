import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { moderationEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar um usuário do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário que será expulso')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('reason')
            .setDescription('Motivo da expulsão')
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

    // Check if target is the command user
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'You cannot kick yourself.')],
            ephemeral: true,
        });
        return;
    }

    // Check if target is a bot
    if (targetUser.bot && targetUser.id === interaction.client.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'I cannot kick myself.')],
            ephemeral: true,
        });
        return;
    }

    try {
        // Get member
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'User is not in this server.')],
                ephemeral: true,
            });
            return;
        }

        const executor = interaction.member as GuildMember;

        // Check role hierarchy
        if (targetMember.roles.highest.position >= executor.roles.highest.position) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'You cannot kick this user due to role hierarchy.')],
                ephemeral: true,
            });
            return;
        }

        // Check if bot can kick
        const botMember = await interaction.guild.members.fetchMe();
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'I cannot kick this user due to role hierarchy.')],
                ephemeral: true,
            });
            return;
        }

        if (!targetMember.kickable) {
            await interaction.reply({
                embeds: [errorEmbed('Error', 'I cannot kick this user. They may have higher permissions.')],
                ephemeral: true,
            });
            return;
        }

        // Send DM to user before kicking (if possible)
        try {
            const dmEmbed = moderationEmbed('You have been kicked', {
                moderator: interaction.user.tag,
                reason,
            })
                .setDescription(`You have been kicked from **${interaction.guild.name}**.`);

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (error) {
            logger.debug(`Could not send DM to ${targetUser.tag}`);
        }

        // Kick the user
        await targetMember.kick(`${reason} | Kicked by ${interaction.user.tag}`);

        // Ensure guild exists in database
        await ensureGuild(interaction.guild.id, interaction.guild.name);

        // Log to database
        await prisma.modLog.create({
            data: {
                guildId: interaction.guild.id,
                action: 'kick',
                targetId: targetUser.id,
                targetTag: targetUser.tag,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason,
            },
        });

        // Send confirmation
        const embed = successEmbed('User Kicked')
            .setDescription(`**${targetUser.tag}** has been kicked from the server.`)
            .addFields(
                { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true },
                { name: 'Reason', value: reason, inline: false }
            );

        await interaction.reply({ embeds: [embed] });

        logger.info(`User kicked: ${targetUser.tag} by ${interaction.user.tag} in ${interaction.guild.name}`);

    } catch (error) {
        logger.error('Error executing kick command:', error);
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Failed to kick user. Please check my permissions and try again.')],
            ephemeral: true,
        });
    }
}
