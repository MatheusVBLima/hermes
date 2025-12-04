import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { xpForLevel } from '../../events/messageCreate.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Ver seu nível/XP ou de outro usuário')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário para consultar nível/XP')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Este comando só pode ser usado em um servidor.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Check if target is a bot
    if (targetUser.bot) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Bots não possuem níveis.')],
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
                embeds: [infoEmbed('Sem dados', `${targetUser.tag} ainda não ganhou XP.`)],
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
                { name: '🏆 Posição', value: `#${rank}`, inline: true },
                { name: '⭐ Nível', value: userLevel.level.toString(), inline: true },
                { name: '✨ XP total', value: userLevel.xp.toLocaleString(), inline: true },
                {
                    name: '📈 Progresso para o próximo nível',
                    value: [
                        progressBar,
                        `${xpProgress.toLocaleString()} / ${xpForCurrentLevel.toLocaleString()} XP (${progressPercentage}%)`,
                        `Faltam **${xpNeeded.toLocaleString()} XP** para o nível ${userLevel.level + 1}`,
                    ].join('\n'),
                    inline: false,
                }
            )
            .setColor(0x5865f2);

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error in rank command:', error);

        const errorMessage = {
            embeds: [errorEmbed('Erro', 'Falha ao buscar dados de rank. Tente novamente.')],
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
