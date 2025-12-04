import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('xpsettings')
    .setDescription('Configurar sistema de XP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Ativar/desativar sistema de XP')
            .addBooleanOption(option =>
                option
                    .setName('ativo')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('range')
            .setDescription('Configurar quantidade de XP por mensagem')
            .addIntegerOption(option =>
                option
                    .setName('minimo')
                    .setDescription('XP mínimo por mensagem')
                    .setMinValue(1)
                    .setMaxValue(100)
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('maximo')
                    .setDescription('XP máximo por mensagem')
                    .setMinValue(1)
                    .setMaxValue(100)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('cooldown')
            .setDescription('Configurar tempo entre ganho de XP')
            .addIntegerOption(option =>
                option
                    .setName('segundos')
                    .setDescription('Tempo em segundos')
                    .setMinValue(10)
                    .setMaxValue(300)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('levelupmessage')
            .setDescription('Ativar/desativar mensagem de level up')
            .addBooleanOption(option =>
                option
                    .setName('ativo')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ignorechannel')
            .setDescription('Ignorar canal (não dar XP)')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal para ignorar')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('unignorechannel')
            .setDescription('Parar de ignorar canal')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal para parar de ignorar')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Ver configurações atuais de XP')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'Este comando só pode ser usado em servidores.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'toggle':
            await handleToggle(interaction);
            break;
        case 'range':
            await handleRange(interaction);
            break;
        case 'cooldown':
            await handleCooldown(interaction);
            break;
        case 'levelupmessage':
            await handleLevelUpMessage(interaction);
            break;
        case 'ignorechannel':
            await handleIgnoreChannel(interaction);
            break;
        case 'unignorechannel':
            await handleUnignoreChannel(interaction);
            break;
        case 'status':
            await handleStatus(interaction);
            break;
    }
}

async function handleToggle(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativo', true);

    await prisma.xPSettings.upsert({
        where: { guildId: interaction.guild!.id },
        update: { xpEnabled: enabled },
        create: {
            guildId: interaction.guild!.id,
            xpEnabled: enabled,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                enabled ? 'Sistema de XP Ativado' : 'Sistema de XP Desativado',
                enabled
                    ? 'Os usuários agora ganham XP ao enviar mensagens.'
                    : 'Os usuários não ganham mais XP ao enviar mensagens.'
            ),
        ],
    });

    logger.info(`[XP] ${enabled ? 'Enabled' : 'Disabled'} in ${interaction.guild!.name}`);
}

async function handleRange(interaction: ChatInputCommandInteraction) {
    const min = interaction.options.getInteger('minimo', true);
    const max = interaction.options.getInteger('maximo', true);

    if (min > max) {
        await interaction.reply({
            embeds: [errorEmbed('Erro', 'O XP mínimo não pode ser maior que o máximo.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await prisma.xPSettings.upsert({
        where: { guildId: interaction.guild!.id },
        update: { xpMin: min, xpMax: max },
        create: {
            guildId: interaction.guild!.id,
            xpMin: min,
            xpMax: max,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Faixa de XP Atualizada',
                `Os usuários agora ganham entre **${min}** e **${max}** XP por mensagem.`
            ),
        ],
    });

    logger.info(`[XP] Set range ${min}-${max} in ${interaction.guild!.name}`);
}

async function handleCooldown(interaction: ChatInputCommandInteraction) {
    const seconds = interaction.options.getInteger('segundos', true);
    const milliseconds = seconds * 1000;

    await prisma.xPSettings.upsert({
        where: { guildId: interaction.guild!.id },
        update: { xpCooldown: milliseconds },
        create: {
            guildId: interaction.guild!.id,
            xpCooldown: milliseconds,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Cooldown de XP Atualizado',
                `Os usuários agora podem ganhar XP a cada **${seconds}** segundo(s).`
            ),
        ],
    });

    logger.info(`[XP] Set cooldown ${seconds}s in ${interaction.guild!.name}`);
}

async function handleLevelUpMessage(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativo', true);

    await prisma.xPSettings.upsert({
        where: { guildId: interaction.guild!.id },
        update: { levelUpMessage: enabled },
        create: {
            guildId: interaction.guild!.id,
            levelUpMessage: enabled,
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Mensagens de Level Up',
                enabled
                    ? 'Mensagens de level up **ativadas**.'
                    : 'Mensagens de level up **desativadas**.'
            ),
        ],
    });

    logger.info(`[XP] Level up messages ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name}`);
}

async function handleIgnoreChannel(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal', true);

    const settings = await prisma.xPSettings.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    let ignoredChannels: string[] = [];
    if (settings?.ignoredChannels) {
        ignoredChannels = JSON.parse(settings.ignoredChannels);
    }

    if (ignoredChannels.includes(channel.id)) {
        await interaction.reply({
            embeds: [errorEmbed('Já Ignorado', 'Este canal já está sendo ignorado.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    ignoredChannels.push(channel.id);

    await prisma.xPSettings.upsert({
        where: { guildId: interaction.guild!.id },
        update: { ignoredChannels: JSON.stringify(ignoredChannels) },
        create: {
            guildId: interaction.guild!.id,
            ignoredChannels: JSON.stringify(ignoredChannels),
        },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Canal Ignorado',
                `${channel} agora está ignorado. Mensagens neste canal não darão XP.`
            ),
        ],
    });

    logger.info(`[XP] Ignored channel ${channel.id} in ${interaction.guild!.name}`);
}

async function handleUnignoreChannel(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal', true);

    const settings = await prisma.xPSettings.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    if (!settings?.ignoredChannels) {
        await interaction.reply({
            embeds: [errorEmbed('Não Ignorado', 'Este canal não está sendo ignorado.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    let ignoredChannels: string[] = JSON.parse(settings.ignoredChannels);

    if (!ignoredChannels.includes(channel.id)) {
        await interaction.reply({
            embeds: [errorEmbed('Não Ignorado', 'Este canal não está sendo ignorado.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    ignoredChannels = ignoredChannels.filter(id => id !== channel.id);

    await prisma.xPSettings.update({
        where: { id: settings.id },
        data: { ignoredChannels: JSON.stringify(ignoredChannels) },
    });

    await interaction.reply({
        embeds: [
            successEmbed(
                'Canal Designorado',
                `${channel} não está mais ignorado. Mensagens neste canal darão XP.`
            ),
        ],
    });

    logger.info(`[XP] Unignored channel ${channel.id} in ${interaction.guild!.name}`);
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
    const settings = await prisma.xPSettings.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const enabled = settings?.xpEnabled ?? true;
    const xpMin = settings?.xpMin ?? 15;
    const xpMax = settings?.xpMax ?? 25;
    const cooldown = (settings?.xpCooldown ?? 60000) / 1000;
    const levelUpMsg = settings?.levelUpMessage ?? true;
    const ignoredChannels = settings?.ignoredChannels ? JSON.parse(settings.ignoredChannels) : [];

    const embed = infoEmbed('⚙️ Configurações de XP')
        .addFields(
            {
                name: '📊 Status',
                value: enabled ? '✅ Ativo' : '❌ Desativado',
                inline: true,
            },
            {
                name: '💎 Faixa de XP',
                value: `${xpMin} - ${xpMax} por mensagem`,
                inline: true,
            },
            {
                name: '⏱️ Cooldown',
                value: `${cooldown} segundo(s)`,
                inline: true,
            },
            {
                name: '📢 Mensagem de Level Up',
                value: levelUpMsg ? '✅ Ativada' : '❌ Desativada',
                inline: true,
            },
            {
                name: '🚫 Canais Ignorados',
                value: ignoredChannels.length > 0
                    ? ignoredChannels.map((id: string) => `<#${id}>`).join(', ')
                    : 'Nenhum',
                inline: false,
            }
        );

    await interaction.reply({ embeds: [embed] });
}
