import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { infoEmbed, errorEmbed } from '../../utils/embeds.js';
import { prisma } from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Ver o ranking de XP do servidor')
    .addIntegerOption(option =>
        option
            .setName('page')
            .setDescription('Número da página (10 usuários por página)')
            .setMinValue(1)
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

    const page = interaction.options.getInteger('page') || 1;
    const perPage = 10;
    const skip = (page - 1) * perPage;

    try {
        // Get total count
        const totalUsers = await prisma.userLevel.count({
            where: {
                guildId: interaction.guild.id,
            },
        });

        if (totalUsers === 0) {
            await interaction.reply({
                embeds: [infoEmbed('Ranking vazio', 'Nenhum usuário ganhou XP ainda. Comece a conversar para ganhar XP!')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const totalPages = Math.ceil(totalUsers / perPage);

        // Validate page number
        if (page > totalPages) {
            await interaction.reply({
                embeds: [errorEmbed('Página inválida', `Existem apenas ${totalPages} página(s) disponíveis.`)],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // Get top users for this page
        const topUsers = await prisma.userLevel.findMany({
            where: {
                guildId: interaction.guild.id,
            },
            orderBy: {
                xp: 'desc',
            },
            take: perPage,
            skip: skip,
        });

        // Build leaderboard
        const embed = infoEmbed(`🏆 Ranking de XP - ${interaction.guild.name}`)
            .setDescription(`Mostrando os melhores usuários (Página ${page}/${totalPages})`);

        // Add server icon if available
        const iconURL = interaction.guild.iconURL({ size: 128 });
        if (iconURL) {
            embed.setThumbnail(iconURL);
        }

        const leaderboardText = await Promise.all(
            topUsers.map(async (userData, index) => {
                const globalRank = skip + index + 1;
                const medal = getMedal(globalRank);

                // Try to fetch user from Discord
                try {
                    const user = await interaction.client.users.fetch(userData.userId);
                    const username = user.tag;

                    return [
                        `${medal} **#${globalRank}** - ${username}`,
                        `└ Level **${userData.level}** • **${userData.xp.toLocaleString()}** XP`,
                    ].join('\n');
                } catch {
                    // User not found (left server or deleted account)
                    return [
                        `${medal} **#${globalRank}** - Usuário desconhecido`,
                        `└ Nível **${userData.level}** • **${userData.xp.toLocaleString()}** XP`,
                    ].join('\n');
                }
            })
        );

        embed.addFields({
            name: '\u200b',
            value: leaderboardText.join('\n\n'),
            inline: false,
        });

        // Add user's position if not on current page
        const userLevel = await prisma.userLevel.findUnique({
            where: {
                userId_guildId: {
                    userId: interaction.user.id,
                    guildId: interaction.guild.id,
                },
            },
        });

        if (userLevel) {
            const userRank = await prisma.userLevel.count({
                where: {
                    guildId: interaction.guild.id,
                    xp: {
                        gt: userLevel.xp,
                    },
                },
            }) + 1;

            // Only show if user is not on current page
            const userPage = Math.ceil(userRank / perPage);
            if (userPage !== page) {
                embed.setFooter({
                    text: `Sua posição: #${userRank} • Nível ${userLevel.level} • ${userLevel.xp.toLocaleString()} XP`,
                });
            }
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error in leaderboard command:', error);

        const errorMessage = {
            embeds: [errorEmbed('Error', 'Failed to fetch leaderboard. Please try again.')],
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
 * Get medal emoji for top 3
 */
function getMedal(rank: number): string {
    switch (rank) {
        case 1:
            return '🥇';
        case 2:
            return '🥈';
        case 3:
            return '🥉';
        default:
            return '📍';
    }
}
