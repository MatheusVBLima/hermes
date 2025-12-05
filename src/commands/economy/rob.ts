import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const ROB_COOLDOWN = 60 * 60 * 1000; // 1 hour
const ROB_MIN_BALANCE = 500; // Min balance needed to rob
const ROB_SUCCESS_RATE = 0.45; // 45% chance of success
const ROB_CATCH_FINE_PERCENT = 0.3; // 30% fine if caught

export const data = new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Tentar roubar moedas de outro usuário (45% de chance)')
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Usuário para roubar')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Este comando só pode ser usado em servidores.')],
            ephemeral: true,
        });
        return;
    }

    const targetUser = interaction.options.getUser('usuario', true);

    // Check if trying to rob self
    if (targetUser.id === interaction.user.id) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Você não pode roubar a si mesmo!')],
            ephemeral: true,
        });
        return;
    }

    // Check if target is bot
    if (targetUser.bot) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Você não pode roubar bots!')],
            ephemeral: true,
        });
        return;
    }

    // Get or create user economy
    let userEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
            },
        },
    });

    if (!userEconomy) {
        userEconomy = await prisma.userEconomy.create({
            data: {
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                balance: 0,
            },
        });
    }

    // Check cooldown
    if (userEconomy.lastRob) {
        const timeSinceRob = Date.now() - userEconomy.lastRob.getTime();
        if (timeSinceRob < ROB_COOLDOWN) {
            const timeLeft = ROB_COOLDOWN - timeSinceRob;
            const minutes = Math.ceil(timeLeft / 60000);
            await interaction.reply({
                embeds: [
                    errorEmbed(
                        'Cooldown Ativo',
                        `Você precisa esperar **${minutes} minuto(s)** antes de roubar novamente.`
                    ),
                ],
                ephemeral: true,
            });
            return;
        }
    }

    // Check if user has minimum balance
    if (userEconomy.balance < ROB_MIN_BALANCE) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Saldo Insuficiente',
                    `Você precisa de no mínimo **${ROB_MIN_BALANCE}** moedas para roubar alguém.`
                ),
            ],
            ephemeral: true,
        });
        return;
    }

    // Get target economy
    let targetEconomy = await prisma.userEconomy.findUnique({
        where: {
            userId_guildId: {
                userId: targetUser.id,
                guildId: interaction.guild.id,
            },
        },
    });

    if (!targetEconomy) {
        targetEconomy = await prisma.userEconomy.create({
            data: {
                userId: targetUser.id,
                guildId: interaction.guild.id,
                balance: 0,
            },
        });
    }

    // Check if target has money to steal
    if (targetEconomy.balance < ROB_MIN_BALANCE) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Alvo Pobre',
                    `${targetUser.tag} não tem moedas suficientes para roubar! (mínimo: ${ROB_MIN_BALANCE})`
                ),
            ],
            ephemeral: true,
        });
        return;
    }

    // Roll for success
    const success = Math.random() < ROB_SUCCESS_RATE;

    // Update rob cooldown
    await prisma.userEconomy.update({
        where: { id: userEconomy.id },
        data: { lastRob: new Date() },
    });

    if (success) {
        // Success: steal 10-30% of target's balance
        const stealPercent = 0.1 + Math.random() * 0.2; // 10-30%
        const stolen = Math.floor(targetEconomy.balance * stealPercent);

        // Update balances
        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance + stolen },
        });

        await prisma.userEconomy.update({
            where: { id: targetEconomy.id },
            data: { balance: targetEconomy.balance - stolen },
        });

        await interaction.reply({
            embeds: [
                successEmbed(
                    '💰 Roubo Bem-Sucedido!',
                    `Você roubou **${stolen}** moedas de ${targetUser}!\n\n` +
                    `Seu novo saldo: **${userEconomy.balance + stolen}** moedas`
                ),
            ],
        });

        logger.info(`[Rob] ${interaction.user.tag} robbed ${stolen} from ${targetUser.tag}`);
    } else {
        // Failed: lose 30% of balance as fine
        const fine = Math.floor(userEconomy.balance * ROB_CATCH_FINE_PERCENT);

        await prisma.userEconomy.update({
            where: { id: userEconomy.id },
            data: { balance: userEconomy.balance - fine },
        });

        await interaction.reply({
            embeds: [
                errorEmbed(
                    '🚨 Você Foi Pego!',
                    `Você foi pego tentando roubar ${targetUser} e pagou **${fine}** moedas de multa!\n\n` +
                    `Seu novo saldo: **${userEconomy.balance - fine}** moedas`
                ),
            ],
        });

        logger.info(`[Rob] ${interaction.user.tag} failed to rob ${targetUser.tag}, lost ${fine}`);
    }
}
