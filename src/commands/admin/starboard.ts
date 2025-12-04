import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ChannelType,
    PermissionFlagsBits,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configurar o sistema de starboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('setup')
            .setDescription('Configurar o canal de starboard')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal onde as mensagens destacadas serão enviadas')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('threshold')
            .setDescription('Configurar quantidade mínima de estrelas')
            .addIntegerOption(option =>
                option
                    .setName('quantidade')
                    .setDescription('Número de estrelas necessárias')
                    .setMinValue(1)
                    .setMaxValue(50)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('emoji')
            .setDescription('Configurar emoji do starboard')
            .addStringOption(option =>
                option
                    .setName('emoji')
                    .setDescription('Emoji para rastrear (padrão: ⭐)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('selfstar')
            .setDescription('Permitir que usuários deem estrela nas próprias mensagens')
            .addBooleanOption(option =>
                option
                    .setName('permitir')
                    .setDescription('Permitir auto-estrelas?')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Ativar/desativar o starboard')
            .addBooleanOption(option =>
                option
                    .setName('ativo')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Ver configurações atuais do starboard')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leaderboard')
            .setDescription('Ver as mensagens mais estreladas')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'setup':
            await handleSetup(interaction);
            break;
        case 'threshold':
            await handleThreshold(interaction);
            break;
        case 'emoji':
            await handleEmoji(interaction);
            break;
        case 'selfstar':
            await handleSelfStar(interaction);
            break;
        case 'toggle':
            await handleToggle(interaction);
            break;
        case 'status':
            await handleStatus(interaction);
            break;
        case 'leaderboard':
            await handleLeaderboard(interaction);
            break;
    }
}

async function handleSetup(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal', true);

    const starboard = await prisma.starboard.upsert({
        where: { guildId: interaction.guild!.id },
        update: { channelId: channel.id },
        create: {
            guildId: interaction.guild!.id,
            channelId: channel.id,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Starboard Configurado',
                `O canal de starboard foi configurado para ${channel}.\n\n` +
                `**Limiar atual:** ${starboard.threshold} ⭐\n` +
                `**Status:** ${starboard.enabled ? '✅ Ativo' : '❌ Inativo'}\n\n` +
                `Use \`/starboard toggle\` para ativar.`
            ),
        ],
    });

    logger.info(`[Starboard] Channel set to ${channel.id} in ${interaction.guild!.name}`);
}

async function handleThreshold(interaction: ChatInputCommandInteraction) {
    const threshold = interaction.options.getInteger('quantidade', true);

    await prisma.starboard.upsert({
        where: { guildId: interaction.guild!.id },
        update: { threshold },
        create: {
            guildId: interaction.guild!.id,
            threshold,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Limiar Atualizado',
                `Agora são necessárias **${threshold}** ⭐ para uma mensagem aparecer no starboard.`
            ),
        ],
    });

    logger.info(`[Starboard] Threshold set to ${threshold} in ${interaction.guild!.name}`);
}

async function handleEmoji(interaction: ChatInputCommandInteraction) {
    const emoji = interaction.options.getString('emoji', true);

    await prisma.starboard.upsert({
        where: { guildId: interaction.guild!.id },
        update: { emoji },
        create: {
            guildId: interaction.guild!.id,
            emoji,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Emoji Atualizado',
                `O emoji do starboard foi alterado para ${emoji}`
            ),
        ],
    });

    logger.info(`[Starboard] Emoji set to ${emoji} in ${interaction.guild!.name}`);
}

async function handleSelfStar(interaction: ChatInputCommandInteraction) {
    const allow = interaction.options.getBoolean('permitir', true);

    await prisma.starboard.upsert({
        where: { guildId: interaction.guild!.id },
        update: { selfStar: allow },
        create: {
            guildId: interaction.guild!.id,
            selfStar: allow,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Auto-Estrelas Configurado',
                allow
                    ? 'Usuários agora **podem** dar estrelas nas próprias mensagens.'
                    : 'Usuários **não podem mais** dar estrelas nas próprias mensagens.'
            ),
        ],
    });

    logger.info(`[Starboard] Self-star set to ${allow} in ${interaction.guild!.name}`);
}

async function handleToggle(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativo', true);

    const starboard = await prisma.starboard.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    if (!starboard?.channelId) {
        await interaction.reply({
            embeds: [
                errorEmbed(
                    'Canal Não Configurado',
                    'Configure um canal primeiro usando `/starboard setup`.'
                ),
            ],
            ephemeral: true,
        });
        return;
    }

    await prisma.starboard.update({
        where: { guildId: interaction.guild!.id },
        data: { enabled },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                enabled ? 'Starboard Ativado' : 'Starboard Desativado',
                enabled
                    ? `O starboard está agora **ativo** em <#${starboard.channelId}>.`
                    : 'O starboard foi **desativado**.'
            ),
        ],
    });

    logger.info(`[Starboard] ${enabled ? 'Enabled' : 'Disabled'} in ${interaction.guild!.name}`);
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
    const starboard = await prisma.starboard.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    if (!starboard) {
        await interaction.reply({
            embeds: [
                infoEmbed('Starboard Não Configurado')
                    .setDescription('Use `/starboard setup` para configurar o starboard.'),
            ],
            ephemeral: true,
        });
        return;
    }

    const totalStars = await prisma.starredMessage.count({
        where: { guildId: interaction.guild!.id },
    });

    const embed = infoEmbed('Configurações do Starboard')
        .addFields(
            {
                name: '📋 Status',
                value: starboard.enabled ? '✅ Ativo' : '❌ Inativo',
                inline: true,
            },
            {
                name: '📍 Canal',
                value: starboard.channelId ? `<#${starboard.channelId}>` : 'Não configurado',
                inline: true,
            },
            {
                name: '⭐ Limiar',
                value: `${starboard.threshold} estrelas`,
                inline: true,
            },
            {
                name: '😄 Emoji',
                value: starboard.emoji,
                inline: true,
            },
            {
                name: '👤 Auto-Estrelas',
                value: starboard.selfStar ? 'Permitido' : 'Não permitido',
                inline: true,
            },
            {
                name: '📊 Total de Mensagens',
                value: totalStars.toString(),
                inline: true,
            }
        );

    await interaction.reply({ embeds: [embed] });
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
    const topMessages = await prisma.starredMessage.findMany({
        where: { guildId: interaction.guild!.id },
        orderBy: { stars: 'desc' },
        take: 10,
    });

    if (topMessages.length === 0) {
        await interaction.reply({
            embeds: [
                infoEmbed('Nenhuma Mensagem Estrelada')
                    .setDescription('Ainda não há mensagens no starboard.'),
            ],
            ephemeral: true,
        });
        return;
    }

    const description = topMessages
        .map((msg, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
            return `${medal} **${msg.stars}** ⭐ - [Mensagem](https://discord.com/channels/${interaction.guild!.id}/${msg.channelId}/${msg.messageId}) de <@${msg.authorId}>`;
        })
        .join('\n\n');

    const embed = infoEmbed('🏆 Top Mensagens Estreladas')
        .setDescription(description)
        .setFooter({ text: `Total de ${topMessages.length} mensagens no starboard` });

    await interaction.reply({ embeds: [embed] });
}
