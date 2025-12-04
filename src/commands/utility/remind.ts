import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Sistema de lembretes')
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Criar um lembrete')
            .addStringOption(option =>
                option
                    .setName('tempo')
                    .setDescription('Tempo para o lembrete (ex: 1h, 30m, 2d)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mensagem')
                    .setDescription('Mensagem do lembrete')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Ver seus lembretes ativos')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('cancel')
            .setDescription('Cancelar um lembrete')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('ID do lembrete')
                    .setRequired(true)
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'create':
            await handleCreate(interaction);
            break;
        case 'list':
            await handleList(interaction);
            break;
        case 'cancel':
            await handleCancel(interaction);
            break;
    }
}

function parseTime(timeStr: string): number | null {
    const regex = /^(\d+)([smhd])$/;
    const match = timeStr.toLowerCase().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
    const timeStr = interaction.options.getString('tempo', true);
    const message = interaction.options.getString('mensagem', true);

    const duration = parseTime(timeStr);

    if (!duration) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Formato Inválido',
                    'Use o formato: `1s` (segundos), `1m` (minutos), `1h` (horas), `1d` (dias)\n\n' +
                    'Exemplos: `30m`, `2h`, `1d`'
                ),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Max 30 days
    if (duration > 30 * 24 * 60 * 60 * 1000) {
        await interaction.reply({
            embeds: [errorEmbed('Tempo Muito Longo', 'O tempo máximo para um lembrete é de 30 dias.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Min 10 seconds
    if (duration < 10000) {
        await interaction.reply({
            embeds: [errorEmbed('Tempo Muito Curto', 'O tempo mínimo para um lembrete é de 10 segundos.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const remindAt = new Date(Date.now() + duration);

    const reminder = await prisma.reminder.create({
        data: {
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
            channelId: interaction.channel!.id,
            message,
            remindAt,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                '⏰ Lembrete Criado!',
                `Vou lembrá-lo sobre: **${message}**\n\n` +
                `Quando: <t:${Math.floor(remindAt.getTime() / 1000)}:R>\n` +
                `ID do lembrete: \`${reminder.id}\``
            ),
        ],
    });

    logger.info(`[Reminder] Created reminder ${reminder.id} for ${interaction.user.tag}`);

    // Schedule reminder
    scheduleReminder(reminder.id, duration);
}

async function handleList(interaction: ChatInputCommandInteraction) {
    const reminders = await prisma.reminder.findMany({
        where: {
            userId: interaction.user.id,
            completed: false,
        },
        orderBy: { remindAt: 'asc' },
        take: 10,
    });

    if (reminders.length === 0) {
        await interaction.reply({
            embeds: [
                infoEmbed('Sem Lembretes')
                    .setDescription('Você não tem nenhum lembrete ativo.'),
            ],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const list = reminders.map(reminder => {
        const timestamp = Math.floor(reminder.remindAt.getTime() / 1000);
        return `**[${reminder.id}]** ${reminder.message}\n` +
               `⏰ <t:${timestamp}:R> (<t:${timestamp}:f>)`;
    }).join('\n\n');

    const embed = infoEmbed('⏰ Seus Lembretes')
        .setDescription(list)
        .setFooter({ text: `Total: ${reminders.length} lembrete(s) | Use /remind cancel <id> para cancelar` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleCancel(interaction: ChatInputCommandInteraction) {
    const reminderId = interaction.options.getInteger('id', true);

    const reminder = await prisma.reminder.findFirst({
        where: {
            id: reminderId,
            userId: interaction.user.id,
            completed: false,
        },
    });

    if (!reminder) {
        await interaction.reply({
            embeds: [errorEmbed('Lembrete Não Encontrado', 'Este lembrete não existe ou já foi concluído.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await prisma.reminder.delete({
        where: { id: reminder.id },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Lembrete Cancelado',
                `O lembrete **"${reminder.message}"** foi cancelado.`
            ),
        ],
        flags: MessageFlags.Ephemeral,
    });

    logger.info(`[Reminder] Cancelled reminder ${reminder.id} for ${interaction.user.tag}`);
}

function scheduleReminder(reminderId: number, delay: number): void {
    setTimeout(async () => {
        try {
            const reminder = await prisma.reminder.findUnique({
                where: { id: reminderId },
            });

            if (!reminder || reminder.completed) return;

            // Mark as completed
            await prisma.reminder.update({
                where: { id: reminderId },
                data: { completed: true },
            });

            // Send reminder
            const client = (global as any).client;
            if (!client) return;

            const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
            if (!channel || !channel.isTextBased()) return;

            const embed = infoEmbed('⏰ Lembrete!')
                .setDescription(`<@${reminder.userId}>, você pediu para ser lembrado sobre:\n\n**${reminder.message}**`)
                .setFooter({ text: `Lembrete criado` })
                .setTimestamp(reminder.createdAt);

            await channel.send({
                content: `<@${reminder.userId}>`,
                embeds: [embed],
            });

            logger.info(`[Reminder] Sent reminder ${reminderId} to user ${reminder.userId}`);
        } catch (error) {
            logger.error(`[Reminder] Error sending reminder ${reminderId}:`, error);
        }
    }, delay);
}

// Function to load pending reminders on bot start
export async function loadPendingReminders(): Promise<void> {
    try {
        // Check if prisma is ready
        if (!prisma?.reminder) {
            logger.warn('[Reminder] Prisma not ready or Reminder table not found. Skipping...');
            return;
        }

        const pendingReminders = await prisma.reminder.findMany({
            where: {
                completed: false,
                remindAt: {
                    gt: new Date(),
                },
            },
        });

        for (const reminder of pendingReminders) {
            const delay = reminder.remindAt.getTime() - Date.now();
            if (delay > 0) {
                scheduleReminder(reminder.id, delay);
                logger.info(`[Reminder] Scheduled pending reminder ${reminder.id}`);
            }
        }

        logger.info(`[Reminder] Loaded ${pendingReminders.length} pending reminders`);
    } catch (error) {
        logger.error('[Reminder] Error loading pending reminders:', error);
    }
}
