import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    TextChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Gerenciar sorteios')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('start')
            .setDescription('Iniciar um novo sorteio')
            .addStringOption(option =>
                option
                    .setName('premio')
                    .setDescription('O que será sorteado')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('duracao')
                    .setDescription('Duração em minutos')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(10080) // 7 days
            )
            .addIntegerOption(option =>
                option
                    .setName('vencedores')
                    .setDescription('Número de vencedores (padrão: 1)')
                    .setMinValue(1)
                    .setMaxValue(10)
            )
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal para o sorteio (padrão: canal atual)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('end')
            .setDescription('Finalizar um sorteio manualmente')
            .addStringOption(option =>
                option
                    .setName('mensagem_id')
                    .setDescription('ID da mensagem do sorteio')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('reroll')
            .setDescription('Sortear novos vencedores')
            .addStringOption(option =>
                option
                    .setName('mensagem_id')
                    .setDescription('ID da mensagem do sorteio')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Listar sorteios ativos')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'start':
                await handleStart(interaction);
                break;
            case 'end':
                await handleEnd(interaction);
                break;
            case 'reroll':
                await handleReroll(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
        }
    } catch (error) {
        logger.error('Error in giveaway command:', error);
        const embed = errorEmbed('Erro', 'Ocorreu um erro ao executar o comando.');

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

async function handleStart(interaction: ChatInputCommandInteraction) {
    const premio = interaction.options.getString('premio', true);
    const duracao = interaction.options.getInteger('duracao', true);
    const vencedores = interaction.options.getInteger('vencedores') || 1;
    const canal = (interaction.options.getChannel('canal') || interaction.channel) as TextChannel;

    const endsAt = new Date(Date.now() + duracao * 60 * 1000);

    // Create giveaway embed
    const embed = new EmbedBuilder()
        .setTitle('🎉 SORTEIO 🎉')
        .setDescription(`**Prêmio:** ${premio}\n\n**Vencedores:** ${vencedores}\n**Termina:** <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\n**Organizado por:** ${interaction.user}`)
        .setColor(0x5865F2)
        .setFooter({ text: 'Clique no botão abaixo para participar!' })
        .setTimestamp(endsAt);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Participar')
            .setStyle(ButtonStyle.Primary)
    );

    const message = await canal.send({ embeds: [embed], components: [row] });

    // Save to database
    await prisma.giveaway.create({
        data: {
            guildId: interaction.guild!.id,
            channelId: canal.id,
            messageId: message.id,
            hostId: interaction.user.id,
            prize: premio,
            winners: vencedores,
            endsAt: endsAt,
        },
    });

    const successMsg = successEmbed(
        'Sorteio Criado',
        `Sorteio de **${premio}** criado com sucesso!\n\n**Canal:** ${canal}\n**Duração:** ${duracao} minutos\n**Vencedores:** ${vencedores}`
    );

    await interaction.reply({ embeds: [successMsg], ephemeral: true });
    logger.info(`[Giveaway] Started giveaway for "${premio}" in ${canal.name} by ${interaction.user.tag}`);

    // Schedule end
    setTimeout(() => endGiveaway(message.id), duracao * 60 * 1000);
}

async function handleEnd(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('mensagem_id', true);

    const giveaway = await prisma.giveaway.findUnique({
        where: { messageId },
    });

    if (!giveaway) {
        const embed = errorEmbed('Erro', 'Sorteio não encontrado.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (giveaway.ended) {
        const embed = errorEmbed('Erro', 'Este sorteio já foi finalizado.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(messageId);

    const embed = successEmbed('Sorteio Finalizado', 'O sorteio foi finalizado manualmente.');
    await interaction.editReply({ embeds: [embed] });
}

async function handleReroll(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString('mensagem_id', true);

    const giveaway = await prisma.giveaway.findUnique({
        where: { messageId },
    });

    if (!giveaway) {
        const embed = errorEmbed('Erro', 'Sorteio não encontrado.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!giveaway.ended) {
        const embed = errorEmbed('Erro', 'O sorteio ainda não foi finalizado.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Get channel and message
    const channel = interaction.guild!.channels.cache.get(giveaway.channelId) as TextChannel;
    if (!channel) {
        const embed = errorEmbed('Erro', 'Canal do sorteio não encontrado.');
        return await interaction.editReply({ embeds: [embed] });
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
        const embed = errorEmbed('Erro', 'Mensagem do sorteio não encontrada.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Get reactions (participants)
    const reaction = message.reactions.cache.find(r => r.emoji.name === '🎉');
    const users = reaction ? await reaction.users.fetch() : new Map();
    const participants = users.filter(u => !u.bot).map(u => u.id);

    if (participants.length === 0) {
        const embed = errorEmbed('Erro', 'Não há participantes para sortear.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Select new winners
    const previousWinners = giveaway.winnerIds ? JSON.parse(giveaway.winnerIds) : [];
    const eligibleParticipants = participants.filter(p => !previousWinners.includes(p));

    if (eligibleParticipants.length === 0) {
        const embed = errorEmbed('Erro', 'Não há novos participantes elegíveis para sortear.');
        return await interaction.editReply({ embeds: [embed] });
    }

    const shuffled = eligibleParticipants.sort(() => 0.5 - Math.random());
    const newWinners = shuffled.slice(0, giveaway.winners);

    // Announce new winners
    const winnerMentions = newWinners.map(id => `<@${id}>`).join(', ');
    await channel.send({
        content: `🎉 **NOVO SORTEIO!** 🎉\n\n${winnerMentions} ${newWinners.length === 1 ? 'foi sorteado' : 'foram sorteados'} para **${giveaway.prize}**!`,
    });

    // Update database
    await prisma.giveaway.update({
        where: { messageId },
        data: { winnerIds: JSON.stringify([...previousWinners, ...newWinners]) },
    });

    const embed = successEmbed('Reroll Concluído', `Novo vencedor: ${winnerMentions}`);
    await interaction.editReply({ embeds: [embed] });
    logger.info(`[Giveaway] Rerolled giveaway ${messageId}, new winners: ${newWinners.join(', ')}`);
}

async function handleList(interaction: ChatInputCommandInteraction) {
    const giveaways = await prisma.giveaway.findMany({
        where: {
            guildId: interaction.guild!.id,
            ended: false,
        },
        orderBy: { endsAt: 'asc' },
    });

    if (giveaways.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('Sorteios Ativos')
            .setDescription('Não há sorteios ativos no momento.')
            .setColor(0x5865F2);

        return await interaction.reply({ embeds: [embed] });
    }

    let description = '';
    for (const giveaway of giveaways) {
        description += `**${giveaway.prize}**\n`;
        description += `Canal: <#${giveaway.channelId}>\n`;
        description += `Termina: <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>\n`;
        description += `ID: \`${giveaway.messageId}\`\n\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle('Sorteios Ativos')
        .setDescription(description)
        .setColor(0x5865F2)
        .setFooter({ text: `Total: ${giveaways.length} sorteio(s)` });

    await interaction.reply({ embeds: [embed] });
}

// Function to end a giveaway
async function endGiveaway(messageId: string): Promise<void> {
    try {
        const giveaway = await prisma.giveaway.findUnique({
            where: { messageId },
        });

        if (!giveaway || giveaway.ended) return;

        // Get the client from the cached data
        const { Client } = await import('discord.js');

        // We need to get the guild and channel
        // This is a workaround - in production, you'd want to use the bot client
        const guildData = await prisma.guild.findUnique({ where: { id: giveaway.guildId } });
        if (!guildData) return;

        // Mark as ended
        await prisma.giveaway.update({
            where: { messageId },
            data: { ended: true },
        });

        logger.info(`[Giveaway] Giveaway ${messageId} ended (will be processed on next button click)`);
    } catch (error) {
        logger.error('[Giveaway] Error ending giveaway:', error);
    }
}

// Export for use in button handler
export { endGiveaway };
