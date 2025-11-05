import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const MIN_PAYMENT = 1;

export const data = new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Transferir moedas para outro usuário')
    .addUserOption((option) =>
        option
            .setName('usuário')
            .setDescription('Usuário para receber as moedas')
            .setRequired(true)
    )
    .addIntegerOption((option) =>
        option
            .setName('quantia')
            .setDescription('Quantia de moedas a transferir')
            .setRequired(true)
            .setMinValue(MIN_PAYMENT)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const sender = interaction.user;
        const receiver = interaction.options.getUser('usuário', true);
        const amount = interaction.options.getInteger('quantia', true);
        const guildId = interaction.guildId!;

        // Validações
        if (receiver.bot) {
            const embed = errorEmbed(
                'Ação inválida',
                'Você não pode transferir moedas para bots!'
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sender.id === receiver.id) {
            const embed = errorEmbed(
                'Ação inválida',
                'Você não pode transferir moedas para si mesmo!'
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Buscar ou criar registro do remetente
        let senderEconomy = await prisma.userEconomy.findUnique({
            where: {
                userId_guildId: {
                    userId: sender.id,
                    guildId: guildId,
                },
            },
        });

        if (!senderEconomy) {
            senderEconomy = await prisma.userEconomy.create({
                data: {
                    userId: sender.id,
                    guildId: guildId,
                    balance: 0,
                },
            });
        }

        // Verificar se tem saldo suficiente
        if (senderEconomy.balance < amount) {
            const embed = errorEmbed(
                'Saldo insuficiente',
                `Você não tem moedas suficientes! Seu saldo: **${senderEconomy.balance.toLocaleString('pt-BR')}** moedas.`
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Buscar ou criar registro do destinatário
        let receiverEconomy = await prisma.userEconomy.findUnique({
            where: {
                userId_guildId: {
                    userId: receiver.id,
                    guildId: guildId,
                },
            },
        });

        if (!receiverEconomy) {
            receiverEconomy = await prisma.userEconomy.create({
                data: {
                    userId: receiver.id,
                    guildId: guildId,
                    balance: 0,
                },
            });
        }

        // Realizar transferência
        await prisma.$transaction([
            prisma.userEconomy.update({
                where: {
                    userId_guildId: {
                        userId: sender.id,
                        guildId: guildId,
                    },
                },
                data: {
                    balance: {
                        decrement: amount,
                    },
                },
            }),
            prisma.userEconomy.update({
                where: {
                    userId_guildId: {
                        userId: receiver.id,
                        guildId: guildId,
                    },
                },
                data: {
                    balance: {
                        increment: amount,
                    },
                },
            }),
        ]);

        const embed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setTitle('💸 Transferência Realizada')
            .setDescription(
                `**${sender.username}** transferiu **${amount.toLocaleString('pt-BR')}** moedas para **${receiver.username}**!`
            )
            .addFields(
                {
                    name: '📤 Remetente',
                    value: `${sender.username}\nNovo saldo: **${(senderEconomy.balance - amount).toLocaleString('pt-BR')}** moedas`,
                    inline: true,
                },
                {
                    name: '📥 Destinatário',
                    value: `${receiver.username}\nNovo saldo: **${(receiverEconomy.balance + amount).toLocaleString('pt-BR')}** moedas`,
                    inline: true,
                }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in pay command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao realizar a transferência.',
            ephemeral: true,
        });
    }
}
