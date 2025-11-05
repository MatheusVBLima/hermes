import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const MIN_BET = 10;
const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const data = new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Apostar moedas em um jogo de dados')
    .addIntegerOption((option) =>
        option
            .setName('aposta')
            .setDescription('Quantia de moedas a apostar')
            .setRequired(true)
            .setMinValue(MIN_BET)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guildId!;
        const bet = interaction.options.getInteger('aposta', true);

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

        // Verificar saldo
        if (userEconomy.balance < bet) {
            const embed = errorEmbed(
                'Saldo insuficiente',
                `Você não tem moedas suficientes! Seu saldo: **${userEconomy.balance.toLocaleString('pt-BR')}** moedas.`
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Rolar dados
        const userRoll = Math.floor(Math.random() * 6) + 1;
        const botRoll = Math.floor(Math.random() * 6) + 1;

        let result: 'win' | 'lose' | 'tie';
        let balanceChange: number;

        if (userRoll > botRoll) {
            result = 'win';
            balanceChange = bet;
        } else if (userRoll < botRoll) {
            result = 'lose';
            balanceChange = -bet;
        } else {
            result = 'tie';
            balanceChange = 0;
        }

        // Atualizar saldo apenas se não for empate
        if (balanceChange !== 0) {
            userEconomy = await prisma.userEconomy.update({
                where: {
                    userId_guildId: {
                        userId: userId,
                        guildId: guildId,
                    },
                },
                data: {
                    balance: {
                        increment: balanceChange,
                    },
                },
            });
        }

        // Criar embed baseado no resultado
        let title: string;
        let color: number;
        let description: string;

        if (result === 'win') {
            title = '🎉 Você ganhou!';
            color = EmbedColors.SUCCESS;
            description = 'Seu dado foi maior que o do bot!';
        } else if (result === 'lose') {
            title = '😢 Você perdeu!';
            color = EmbedColors.ERROR;
            description = 'O dado do bot foi maior que o seu!';
        } else {
            title = '🤝 Empate!';
            color = EmbedColors.WARNING;
            description = 'Ambos tiraram o mesmo número!';
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .addFields(
                {
                    name: '🎲 Seu Dado',
                    value: `${DICE_EMOJIS[userRoll - 1]} **${userRoll}**`,
                    inline: true,
                },
                {
                    name: '🤖 Dado do Bot',
                    value: `${DICE_EMOJIS[botRoll - 1]} **${botRoll}**`,
                    inline: true,
                },
                {
                    name: '\u200b',
                    value: '\u200b',
                    inline: true,
                }
            );

        if (balanceChange !== 0) {
            embed.addFields(
                {
                    name: balanceChange > 0 ? '💰 Ganho' : '💸 Perda',
                    value: `${balanceChange > 0 ? '+' : ''}${balanceChange.toLocaleString('pt-BR')} moedas`,
                    inline: true,
                },
                {
                    name: '💵 Novo Saldo',
                    value: `${userEconomy.balance.toLocaleString('pt-BR')} moedas`,
                    inline: true,
                }
            );
        } else {
            embed.addFields({
                name: '💵 Saldo',
                value: `${userEconomy.balance.toLocaleString('pt-BR')} moedas (sem mudanças)`,
                inline: false,
            });
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in dice command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao jogar dados.',
            ephemeral: true,
        });
    }
}
