import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, TextChannel } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Apagar várias mensagens de uma vez')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
        option
            .setName('amount')
            .setDescription('Quantidade de mensagens para apagar (1-100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
    )
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Apagar apenas mensagens deste usuário')
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

    if (!(interaction.channel instanceof TextChannel)) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'This command can only be used in text channels.')],
            ephemeral: true,
        });
        return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');

    try {
        // Defer reply since this might take a moment
        await interaction.deferReply({ ephemeral: true });

        // Fetch messages
        const messages = await interaction.channel.messages.fetch({ limit: amount + 1 }); // +1 to exclude the command itself

        // Filter messages if user is specified
        let messagesToDelete = messages;
        if (targetUser) {
            messagesToDelete = messages.filter(msg => msg.author.id === targetUser.id);
        }

        // Remove the interaction's command message from the collection
        messagesToDelete = messagesToDelete.filter(msg => msg.id !== interaction.id);

        if (messagesToDelete.size === 0) {
            await interaction.editReply({
                embeds: [errorEmbed('No Messages', 'No messages found to delete.')],
            });
            return;
        }

        // Discord only allows bulk delete for messages less than 14 days old
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

        if (recentMessages.size === 0) {
            await interaction.editReply({
                embeds: [errorEmbed('Messages Too Old', 'All messages are older than 14 days and cannot be bulk deleted.')],
            });
            return;
        }

        // Delete messages
        const deleted = await interaction.channel.bulkDelete(recentMessages, true);

        // Ensure guild exists in database
        await ensureGuild(interaction.guild.id, interaction.guild.name);

        // Log to database
        await prisma.modLog.create({
            data: {
                guildId: interaction.guild.id,
                action: 'clear',
                targetId: targetUser?.id || 'all',
                targetTag: targetUser?.tag || 'All users',
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag,
                reason: `Cleared ${deleted.size} message(s)`,
                metadata: JSON.stringify({
                    channelId: interaction.channel.id,
                    channelName: interaction.channel.name,
                    messageCount: deleted.size,
                }),
            },
        });

        // Send confirmation
        const embed = successEmbed('Messages Deleted')
            .setDescription(`Successfully deleted **${deleted.size}** message(s).`)
            .addFields(
                { name: 'Channel', value: `#${interaction.channel.name}`, inline: true },
                { name: 'Moderator', value: interaction.user.tag, inline: true }
            );

        if (targetUser) {
            embed.addFields({ name: 'User Filter', value: targetUser.tag, inline: true });
        }

        if (messagesToDelete.size !== deleted.size) {
            embed.setFooter({ text: `${messagesToDelete.size - deleted.size} message(s) were older than 14 days and could not be deleted.` });
        }

        await interaction.editReply({ embeds: [embed] });

        logger.info(`Messages cleared: ${deleted.size} in #${interaction.channel.name} by ${interaction.user.tag}`);

    } catch (error) {
        logger.error('Error executing clear command:', error);

        const errorMsg = {
            embeds: [errorEmbed('Error', 'Failed to delete messages. Please check my permissions and try again.')],
        };

        if (interaction.deferred) {
            await interaction.editReply(errorMsg);
        } else {
            await interaction.reply({ ...errorMsg, ephemeral: true });
        }
    }
}
