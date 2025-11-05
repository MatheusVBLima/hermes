import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const MIN_BET = 10;

export const data = new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Apostar moedas em cara ou coroa')
    .addStringOption((option) =>
        option
            .setName('lado')
            .setDescription('Escolha cara ou coroa')
            .setRequired(true)
            .addChoices(
                { name: '🪙 Cara', value: 'heads' },
                { name: '🎴 Coroa', value: 'tails' }
            )
    )
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
        const choice = interaction.options.getString('lado', true);
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

        // Jogar a moeda
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = result === choice;

        // Atualizar saldo
        const balanceChange = won ? bet : -bet;
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

        // Emojis e textos
        const choiceEmoji = choice === 'heads' ? '🪙 Cara' : '🎴 Coroa';
        const resultEmoji = result === 'heads' ? '🪙 Cara' : '🎴 Coroa';

        const embed = new EmbedBuilder()
            .setColor(won ? EmbedColors.SUCCESS : EmbedColors.ERROR)
            .setTitle(won ? '🎉 Você ganhou!' : '😢 Você perdeu!')
            .setDescription(
                `A moeda caiu em: **${resultEmoji}**\n` +
                `Você escolheu: **${choiceEmoji}**`
            )
            .addFields(
                {
                    name: won ? '💰 Ganho' : '💸 Perda',
                    value: `${won ? '+' : ''}${balanceChange.toLocaleString('pt-BR')} moedas`,
                    inline: true,
                },
                {
                    name: '💵 Novo Saldo',
                    value: `${userEconomy.balance.toLocaleString('pt-BR')} moedas`,
                    inline: true,
                }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in coinflip command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao jogar a moeda.',
            ephemeral: true,
        });
    }
}
