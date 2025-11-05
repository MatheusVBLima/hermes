import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { xpForLevel } from '../../events/messageCreate.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or another user\'s level and XP')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to view rank for')
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

    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Check if target is a bot
    if (targetUser.bot) {
        await interaction.reply({
            embeds: [errorEmbed('Error', 'Bots don\'t have levels.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        // Get user level data
        const userLevel = await prisma.userLevel.findUnique({
            where: {
                userId_guildId: {
                    userId: targetUser.id,
                    guildId: interaction.guild.id,
                },
            },
        });

        if (!userLevel) {
            await interaction.reply({
                embeds: [infoEmbed('No Data', `${targetUser.tag} hasn't earned any XP yet.`)],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Get user's rank in the server
        const higherRanks = await prisma.userLevel.count({
            where: {
                guildId: interaction.guild.id,
                xp: {
                    gt: userLevel.xp,
                },
            },
        });

        const rank = higherRanks + 1;

        // Calculate XP needed for next level
        const currentLevelXp = xpForLevel(userLevel.level);
        const nextLevelXp = xpForLevel(userLevel.level + 1);
        const xpNeeded = nextLevelXp - userLevel.xp;
        const xpProgress = userLevel.xp - currentLevelXp;
        const xpForCurrentLevel = nextLevelXp - currentLevelXp;

        // Calculate progress percentage
        const progressPercentage = Math.floor((xpProgress / xpForCurrentLevel) * 100);

        // Create progress bar
        const progressBar = createProgressBar(progressPercentage);

        // Build embed
        const embed = infoEmbed(`📊 Rank - ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '🏆 Rank', value: `#${rank}`, inline: true },
                { name: '⭐ Level', value: userLevel.level.toString(), inline: true },
                { name: '✨ Total XP', value: userLevel.xp.toLocaleString(), inline: true },
                {
                    name: '📈 Progress to Next Level',
                    value: [
                        progressBar,
                        `${xpProgress.toLocaleString()} / ${xpForCurrentLevel.toLocaleString()} XP (${progressPercentage}%)`,
                        `**${xpNeeded.toLocaleString()} XP** needed for Level ${userLevel.level + 1}`,
                    ].join('\n'),
                    inline: false,
                }
            )
            .setColor(0x5865f2);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error in rank command:', error);

        const errorMessage = {
            embeds: [errorEmbed('Error', 'Failed to fetch rank data. Please try again.')],
            flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage: number, length: number = 10): string {
    const filled = Math.floor((percentage / 100) * length);
    const empty = length - filled;

    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);

    return `[${filledBar}${emptyBar}]`;
}
