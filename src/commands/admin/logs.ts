import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType,
    TextChannel,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { ensureGuild } from '../../services/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configurar sistema de logs do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('setup')
            .setDescription('Configurar o canal de logs')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal onde os logs serão enviados')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('toggle')
            .setDescription('Ativar/desativar tipos de logs')
            .addStringOption(option =>
                option
                    .setName('tipo')
                    .setDescription('Tipo de log')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Mensagens (edições/deleções)', value: 'messages' },
                        { name: 'Membros (entradas/saídas)', value: 'members' },
                        { name: 'Moderação (bans/kicks/warns)', value: 'moderation' },
                        { name: 'Voz (entrar/sair de canais)', value: 'voice' },
                        { name: 'Todos', value: 'all' }
                    )
            )
            .addBooleanOption(option =>
                option
                    .setName('ativado')
                    .setDescription('Ativar ou desativar')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Ver configurações atuais de logs')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('disable')
            .setDescription('Desativar sistema de logs completamente')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
        await ensureGuild(interaction.guild!.id, interaction.guild!.name);

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction);
                break;
            case 'toggle':
                await handleToggle(interaction);
                break;
            case 'status':
                await handleStatus(interaction);
                break;
            case 'disable':
                await handleDisable(interaction);
                break;
        }
    } catch (error) {
        logger.error('Error in logs command:', error);
        const embed = errorEmbed('Erro', 'Ocorreu um erro ao executar o comando.');

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

async function handleSetup(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal', true) as TextChannel;

    // Check if bot can send messages in the channel
    const permissions = channel.permissionsFor(interaction.guild!.members.me!);
    if (!permissions?.has('SendMessages') || !permissions?.has('EmbedLinks')) {
        const embed = errorEmbed(
            'Erro',
            'Não tenho permissão para enviar mensagens ou embeds neste canal.'
        );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await prisma.guild.update({
        where: { id: interaction.guild!.id },
        data: {
            logChannelId: channel.id,
            logMessages: true,
            logMembers: true,
            logModeration: true,
        },
    });

    // Send test message
    const testEmbed = new EmbedBuilder()
        .setTitle('Sistema de Logs Configurado')
        .setDescription('Este canal foi configurado para receber logs do servidor.')
        .setColor(0x57F287)
        .setTimestamp();

    await channel.send({ embeds: [testEmbed] });

    const embed = successEmbed(
        'Logs Configurados',
        `Canal de logs definido para ${channel}!\n\n` +
        '**Logs ativados:**\n' +
        '✅ Mensagens (edições/deleções)\n' +
        '✅ Membros (entradas/saídas)\n' +
        '✅ Moderação (bans/kicks/warns)\n' +
        '❌ Voz (desativado por padrão)\n\n' +
        'Use `/logs toggle` para personalizar.'
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[Logs] Log channel set to ${channel.name} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleToggle(interaction: ChatInputCommandInteraction) {
    const tipo = interaction.options.getString('tipo', true);
    const enabled = interaction.options.getBoolean('ativado', true);

    const guild = await prisma.guild.findUnique({
        where: { id: interaction.guild!.id },
    });

    if (!guild?.logChannelId) {
        const embed = errorEmbed(
            'Erro',
            'Primeiro configure um canal de logs usando `/logs setup`.'
        );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const updateData: any = {};
    const types: string[] = [];

    if (tipo === 'all' || tipo === 'messages') {
        updateData.logMessages = enabled;
        types.push('Mensagens');
    }
    if (tipo === 'all' || tipo === 'members') {
        updateData.logMembers = enabled;
        types.push('Membros');
    }
    if (tipo === 'all' || tipo === 'moderation') {
        updateData.logModeration = enabled;
        types.push('Moderação');
    }
    if (tipo === 'all' || tipo === 'voice') {
        updateData.logVoice = enabled;
        types.push('Voz');
    }

    await prisma.guild.update({
        where: { id: interaction.guild!.id },
        data: updateData,
    });

    const embed = successEmbed(
        enabled ? 'Logs Ativados' : 'Logs Desativados',
        `${enabled ? '✅' : '❌'} ${types.join(', ')}`
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[Logs] ${types.join(', ')} ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
    const guild = await prisma.guild.findUnique({
        where: { id: interaction.guild!.id },
    });

    const statusEmoji = (enabled: boolean | undefined) => enabled ? '✅' : '❌';

    const embed = new EmbedBuilder()
        .setTitle('Configurações de Logs')
        .setColor(0x5865F2)
        .addFields(
            {
                name: '📝 Canal de Logs',
                value: guild?.logChannelId ? `<#${guild.logChannelId}>` : 'Não configurado',
                inline: false,
            },
            {
                name: '💬 Mensagens',
                value: `${statusEmoji(guild?.logMessages)} ${guild?.logMessages ? 'Ativado' : 'Desativado'}`,
                inline: true,
            },
            {
                name: '👥 Membros',
                value: `${statusEmoji(guild?.logMembers)} ${guild?.logMembers ? 'Ativado' : 'Desativado'}`,
                inline: true,
            },
            {
                name: '🔨 Moderação',
                value: `${statusEmoji(guild?.logModeration)} ${guild?.logModeration ? 'Ativado' : 'Desativado'}`,
                inline: true,
            },
            {
                name: '🔊 Voz',
                value: `${statusEmoji(guild?.logVoice)} ${guild?.logVoice ? 'Ativado' : 'Desativado'}`,
                inline: true,
            }
        )
        .setFooter({ text: 'Use /logs toggle para alterar as configurações' });

    await interaction.reply({ embeds: [embed] });
}

async function handleDisable(interaction: ChatInputCommandInteraction) {
    await prisma.guild.update({
        where: { id: interaction.guild!.id },
        data: {
            logChannelId: null,
            logMessages: false,
            logMembers: false,
            logModeration: false,
            logVoice: false,
        },
    });

    const embed = successEmbed(
        'Logs Desativados',
        'Sistema de logs foi completamente desativado.'
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[Logs] Log system disabled in ${interaction.guild!.name} by ${interaction.user.tag}`);
}
