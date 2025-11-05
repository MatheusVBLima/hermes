import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const DAILY_REWARD = 500;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 horas em ms

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Receber sua recompensa diária de moedas');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guildId!;

        // Buscar ou criar registro de economia
        let userEconomy = await prisma.userEconomy.findUnique({
            where: {
                userId_guildId: {
                    userId: userId,
                    guildId: guildId,
                },
            },
        });

        if (!userEconomy) {
            userEconomy = await prisma.userEconomy.create({
                data: {
                    userId: userId,
                    guildId: guildId,
                    balance: 0,
                },
            });
        }

        // Verificar cooldown
        const now = new Date();
        if (userEconomy.lastDaily) {
            const timeSinceLastDaily = now.getTime() - userEconomy.lastDaily.getTime();

            if (timeSinceLastDaily < DAILY_COOLDOWN) {
                const timeLeft = DAILY_COOLDOWN - timeSinceLastDaily;
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = errorEmbed(
                    'Cooldown ativo',
                    `Você já resgatou sua recompensa diária! Volte em **${hoursLeft}h ${minutesLeft}m**.`
                );

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // Atualizar saldo e lastDaily
        userEconomy = await prisma.userEconomy.update({
            where: {
                userId_guildId: {
                    userId: userId,
                    guildId: guildId,
                },
            },
            data: {
                balance: {
                    increment: DAILY_REWARD,
                },
                lastDaily: now,
            },
        });

        const embed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setTitle('🎁 Recompensa Diária')
            .setDescription(`Você recebeu **${DAILY_REWARD.toLocaleString('pt-BR')}** moedas!`)
            .addFields({
                name: '💰 Novo Saldo',
                value: `**${userEconomy.balance.toLocaleString('pt-BR')}** moedas`,
                inline: true,
            })
            .setFooter({ text: 'Volte em 24 horas para resgatar novamente!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in daily command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao resgatar sua recompensa diária.',
            ephemeral: true,
        });
    }
}
