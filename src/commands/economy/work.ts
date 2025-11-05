import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const WORK_MIN = 50;
const WORK_MAX = 150;
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hora em ms

const WORK_MESSAGES = [
    'Você trabalhou como programador e',
    'Você fez entregas e',
    'Você lavou alguns carros e',
    'Você trabalhou em um restaurante e',
    'Você deu aulas particulares e',
    'Você fez alguns bicos e',
    'Você vendeu alguns items e',
    'Você trabalhou como freelancer e',
    'Você ajudou em um evento e',
    'Você trabalhou no mercado e',
];

export const data = new SlashCommandBuilder()
    .setName('work')
    .setDescription('Trabalhar para ganhar moedas');

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
        if (userEconomy.lastWork) {
            const timeSinceLastWork = now.getTime() - userEconomy.lastWork.getTime();

            if (timeSinceLastWork < WORK_COOLDOWN) {
                const timeLeft = WORK_COOLDOWN - timeSinceLastWork;
                const minutesLeft = Math.floor(timeLeft / (60 * 1000));

                const embed = errorEmbed(
                    'Cooldown ativo',
                    `Você está cansado! Descanse por mais **${minutesLeft}** minutos.`
                );

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // Gerar recompensa aleatória
        const reward = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
        const workMessage = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

        // Atualizar saldo e lastWork
        userEconomy = await prisma.userEconomy.update({
            where: {
                userId_guildId: {
                    userId: userId,
                    guildId: guildId,
                },
            },
            data: {
                balance: {
                    increment: reward,
                },
                lastWork: now,
            },
        });

        const embed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setTitle('💼 Trabalho Concluído')
            .setDescription(`${workMessage} ganhou **${reward.toLocaleString('pt-BR')}** moedas!`)
            .addFields({
                name: '💰 Novo Saldo',
                value: `**${userEconomy.balance.toLocaleString('pt-BR')}** moedas`,
                inline: true,
            })
            .setFooter({ text: 'Você pode trabalhar novamente em 1 hora!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        logger.error('Error in work command:', error);
        await interaction.reply({
            content: '❌ Ocorreu um erro ao trabalhar.',
            ephemeral: true,
        });
    }
}
