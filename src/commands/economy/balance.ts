import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Ver seu saldo ou o saldo de outro usuário')
    .addUserOption((option) =>
        option
            .setName('usuário')
            .setDescription('Usuário para ver o saldo')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const targetUser = interaction.options.getUser('usuário') || interaction.user;
        const guildId = interaction.guildId!;

        // Buscar ou criar registro de economia
        let userEconomy = await prisma.userEconomy.findUnique({
            where: {
                userId_guildId: {
                    userId: targetUser.id,
                    guildId: guildId,
                },
            },
        });

        // Se não existe, criar com saldo inicial
        if (!userEconomy) {
            userEconomy = await prisma.userEconomy.create({
                data: {
                    userId: targetUser.id,
                    guildId: guildId,
                    balance: 0,
                },
            });
        }

        // Buscar rank do usuário
        const richerUsers = await prisma.userEconomy.count({
            where: {
                guildId: guildId,
                balance: {
                    gt: userEconomy.balance,
                },
            },
        });

        const rank = richerUsers + 1;

        const embed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setTitle(`💰 Saldo de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .addFields(
                {
                    name: '💵 Saldo',
                    value: `**${userEconomy.balance.toLocaleString('pt-BR')}** moedas`,
                    inline: true,
                },
                {
                    name: '📊 Rank',
                    value: `#${rank}`,
                    inline: true,
                }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in balance command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao buscar o saldo.',
            ephemeral: true,
        });
    }
}
