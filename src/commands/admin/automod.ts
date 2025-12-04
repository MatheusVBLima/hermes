import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    EmbedBuilder,
    ChannelType,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configurar auto-moderação do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('status')
            .setDescription('Ver configurações atuais de auto-moderação')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('antispam')
            .setDescription('Configurar anti-spam')
            .addBooleanOption(option =>
                option
                    .setName('ativado')
                    .setDescription('Ativar ou desativar anti-spam')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('limite')
                    .setDescription('Quantidade de mensagens para detectar spam (padrão: 5)')
                    .setMinValue(3)
                    .setMaxValue(20)
            )
            .addIntegerOption(option =>
                option
                    .setName('intervalo')
                    .setDescription('Intervalo em segundos (padrão: 5)')
                    .setMinValue(3)
                    .setMaxValue(30)
            )
            .addStringOption(option =>
                option
                    .setName('acao')
                    .setDescription('Ação ao detectar spam')
                    .addChoices(
                        { name: 'Deletar mensagens', value: 'delete' },
                        { name: 'Timeout (5 min)', value: 'timeout' },
                        { name: 'Kick', value: 'kick' }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('antiflood')
            .setDescription('Configurar anti-flood (mensagens repetidas)')
            .addBooleanOption(option =>
                option
                    .setName('ativado')
                    .setDescription('Ativar ou desativar anti-flood')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option
                    .setName('limite')
                    .setDescription('Quantidade de mensagens repetidas (padrão: 3)')
                    .setMinValue(2)
                    .setMaxValue(10)
            )
            .addStringOption(option =>
                option
                    .setName('acao')
                    .setDescription('Ação ao detectar flood')
                    .addChoices(
                        { name: 'Deletar mensagens', value: 'delete' },
                        { name: 'Timeout (5 min)', value: 'timeout' },
                        { name: 'Avisar', value: 'warn' }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('antilink')
            .setDescription('Configurar anti-link')
            .addBooleanOption(option =>
                option
                    .setName('ativado')
                    .setDescription('Ativar ou desativar anti-link')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('acao')
                    .setDescription('Ação ao detectar link')
                    .addChoices(
                        { name: 'Deletar mensagem', value: 'delete' },
                        { name: 'Timeout (5 min)', value: 'timeout' },
                        { name: 'Avisar', value: 'warn' }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('allowlink')
            .setDescription('Adicionar domínio à lista de permitidos')
            .addStringOption(option =>
                option
                    .setName('dominio')
                    .setDescription('Domínio a permitir (ex: youtube.com)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('removelink')
            .setDescription('Remover domínio da lista de permitidos')
            .addStringOption(option =>
                option
                    .setName('dominio')
                    .setDescription('Domínio a remover')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('badwords')
            .setDescription('Configurar filtro de palavras proibidas')
            .addBooleanOption(option =>
                option
                    .setName('ativado')
                    .setDescription('Ativar ou desativar filtro')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('acao')
                    .setDescription('Ação ao detectar palavra proibida')
                    .addChoices(
                        { name: 'Deletar mensagem', value: 'delete' },
                        { name: 'Timeout (5 min)', value: 'timeout' },
                        { name: 'Avisar', value: 'warn' }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('addword')
            .setDescription('Adicionar palavra à lista de proibidas')
            .addStringOption(option =>
                option
                    .setName('palavra')
                    .setDescription('Palavra a proibir')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('removeword')
            .setDescription('Remover palavra da lista de proibidas')
            .addStringOption(option =>
                option
                    .setName('palavra')
                    .setDescription('Palavra a remover')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('ignore')
            .setDescription('Ignorar um canal ou cargo na auto-moderação')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal a ignorar')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo a ignorar')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('unignore')
            .setDescription('Remover canal ou cargo da lista de ignorados')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal a remover')
                    .addChannelTypes(ChannelType.GuildText)
            )
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo a remover')
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
        // Ensure settings exist
        await prisma.autoMod.upsert({
            where: { guildId: interaction.guild!.id },
            create: { guildId: interaction.guild!.id },
            update: {},
        });

        switch (subcommand) {
            case 'status':
                await handleStatus(interaction);
                break;
            case 'antispam':
                await handleAntiSpam(interaction);
                break;
            case 'antiflood':
                await handleAntiFlood(interaction);
                break;
            case 'antilink':
                await handleAntiLink(interaction);
                break;
            case 'allowlink':
                await handleAllowLink(interaction);
                break;
            case 'removelink':
                await handleRemoveLink(interaction);
                break;
            case 'badwords':
                await handleBadWords(interaction);
                break;
            case 'addword':
                await handleAddWord(interaction);
                break;
            case 'removeword':
                await handleRemoveWord(interaction);
                break;
            case 'ignore':
                await handleIgnore(interaction);
                break;
            case 'unignore':
                await handleUnignore(interaction);
                break;
        }
    } catch (error) {
        logger.error('Error in automod command:', error);
        const embed = errorEmbed('Erro', 'Ocorreu um erro ao executar o comando.');

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const allowedLinks = settings?.allowedLinks ? JSON.parse(settings.allowedLinks) : [];
    const badWords = settings?.badWordsList ? JSON.parse(settings.badWordsList) : [];
    const ignoredChannels = settings?.ignoredChannels ? JSON.parse(settings.ignoredChannels) : [];
    const ignoredRoles = settings?.ignoredRoles ? JSON.parse(settings.ignoredRoles) : [];

    const statusEmoji = (enabled: boolean) => enabled ? '✅' : '❌';

    const embed = new EmbedBuilder()
        .setTitle('Configurações de Auto-Moderação')
        .setColor(0x5865F2)
        .addFields(
            {
                name: '🚫 Anti-Spam',
                value: `${statusEmoji(settings?.antiSpamEnabled || false)} ${settings?.antiSpamEnabled ? 'Ativado' : 'Desativado'}\n` +
                    `Limite: ${settings?.antiSpamThreshold || 5} msgs/${(settings?.antiSpamInterval || 5000) / 1000}s\n` +
                    `Ação: ${settings?.antiSpamAction || 'timeout'}`,
                inline: true,
            },
            {
                name: '🔁 Anti-Flood',
                value: `${statusEmoji(settings?.antiFloodEnabled || false)} ${settings?.antiFloodEnabled ? 'Ativado' : 'Desativado'}\n` +
                    `Limite: ${settings?.antiFloodThreshold || 3} msgs repetidas\n` +
                    `Ação: ${settings?.antiFloodAction || 'delete'}`,
                inline: true,
            },
            {
                name: '🔗 Anti-Link',
                value: `${statusEmoji(settings?.antiLinkEnabled || false)} ${settings?.antiLinkEnabled ? 'Ativado' : 'Desativado'}\n` +
                    `Ação: ${settings?.antiLinkAction || 'delete'}\n` +
                    `Permitidos: ${allowedLinks.length} domínio(s)`,
                inline: true,
            },
            {
                name: '🤬 Palavras Proibidas',
                value: `${statusEmoji(settings?.badWordsEnabled || false)} ${settings?.badWordsEnabled ? 'Ativado' : 'Desativado'}\n` +
                    `Ação: ${settings?.badWordsAction || 'delete'}\n` +
                    `Lista: ${badWords.length} palavra(s)`,
                inline: true,
            },
            {
                name: '⏭️ Ignorados',
                value: `Canais: ${ignoredChannels.length}\nCargos: ${ignoredRoles.length}`,
                inline: true,
            }
        )
        .setFooter({ text: 'Use /automod [recurso] para configurar cada opção' });

    await interaction.reply({ embeds: [embed] });
}

async function handleAntiSpam(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativado', true);
    const threshold = interaction.options.getInteger('limite');
    const interval = interaction.options.getInteger('intervalo');
    const action = interaction.options.getString('acao');

    const updateData: any = { antiSpamEnabled: enabled };
    if (threshold) updateData.antiSpamThreshold = threshold;
    if (interval) updateData.antiSpamInterval = interval * 1000;
    if (action) updateData.antiSpamAction = action;

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: updateData,
    });

    const embed = successEmbed(
        'Anti-Spam Configurado',
        `Anti-spam ${enabled ? 'ativado' : 'desativado'}!` +
        (threshold ? `\nLimite: ${threshold} mensagens` : '') +
        (interval ? `\nIntervalo: ${interval} segundos` : '') +
        (action ? `\nAção: ${action}` : '')
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[AutoMod] Anti-spam ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleAntiFlood(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativado', true);
    const threshold = interaction.options.getInteger('limite');
    const action = interaction.options.getString('acao');

    const updateData: any = { antiFloodEnabled: enabled };
    if (threshold) updateData.antiFloodThreshold = threshold;
    if (action) updateData.antiFloodAction = action;

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: updateData,
    });

    const embed = successEmbed(
        'Anti-Flood Configurado',
        `Anti-flood ${enabled ? 'ativado' : 'desativado'}!` +
        (threshold ? `\nLimite: ${threshold} mensagens repetidas` : '') +
        (action ? `\nAção: ${action}` : '')
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[AutoMod] Anti-flood ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleAntiLink(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativado', true);
    const action = interaction.options.getString('acao');

    const updateData: any = { antiLinkEnabled: enabled };
    if (action) updateData.antiLinkAction = action;

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: updateData,
    });

    const embed = successEmbed(
        'Anti-Link Configurado',
        `Anti-link ${enabled ? 'ativado' : 'desativado'}!` +
        (action ? `\nAção: ${action}` : '') +
        '\n\nUse `/automod allowlink` para adicionar domínios permitidos.'
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[AutoMod] Anti-link ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleAllowLink(interaction: ChatInputCommandInteraction) {
    const domain = interaction.options.getString('dominio', true).toLowerCase();

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const allowedLinks: string[] = settings?.allowedLinks ? JSON.parse(settings.allowedLinks) : [];

    if (allowedLinks.includes(domain)) {
        const embed = errorEmbed('Erro', 'Este domínio já está na lista de permitidos.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    allowedLinks.push(domain);

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: { allowedLinks: JSON.stringify(allowedLinks) },
    });

    const embed = successEmbed('Domínio Permitido', `O domínio \`${domain}\` foi adicionado à lista de permitidos.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemoveLink(interaction: ChatInputCommandInteraction) {
    const domain = interaction.options.getString('dominio', true).toLowerCase();

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const allowedLinks: string[] = settings?.allowedLinks ? JSON.parse(settings.allowedLinks) : [];
    const index = allowedLinks.indexOf(domain);

    if (index === -1) {
        const embed = errorEmbed('Erro', 'Este domínio não está na lista de permitidos.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    allowedLinks.splice(index, 1);

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: { allowedLinks: JSON.stringify(allowedLinks) },
    });

    const embed = successEmbed('Domínio Removido', `O domínio \`${domain}\` foi removido da lista de permitidos.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleBadWords(interaction: ChatInputCommandInteraction) {
    const enabled = interaction.options.getBoolean('ativado', true);
    const action = interaction.options.getString('acao');

    const updateData: any = { badWordsEnabled: enabled };
    if (action) updateData.badWordsAction = action;

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: updateData,
    });

    const embed = successEmbed(
        'Filtro de Palavras Configurado',
        `Filtro de palavras proibidas ${enabled ? 'ativado' : 'desativado'}!` +
        (action ? `\nAção: ${action}` : '') +
        '\n\nUse `/automod addword` para adicionar palavras à lista.'
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
    logger.info(`[AutoMod] Bad words filter ${enabled ? 'enabled' : 'disabled'} in ${interaction.guild!.name} by ${interaction.user.tag}`);
}

async function handleAddWord(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString('palavra', true).toLowerCase();

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const badWords: string[] = settings?.badWordsList ? JSON.parse(settings.badWordsList) : [];

    if (badWords.includes(word)) {
        const embed = errorEmbed('Erro', 'Esta palavra já está na lista de proibidas.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    badWords.push(word);

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: { badWordsList: JSON.stringify(badWords) },
    });

    const embed = successEmbed('Palavra Adicionada', `A palavra foi adicionada à lista de proibidas.\nTotal: ${badWords.length} palavra(s)`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemoveWord(interaction: ChatInputCommandInteraction) {
    const word = interaction.options.getString('palavra', true).toLowerCase();

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const badWords: string[] = settings?.badWordsList ? JSON.parse(settings.badWordsList) : [];
    const index = badWords.indexOf(word);

    if (index === -1) {
        const embed = errorEmbed('Erro', 'Esta palavra não está na lista de proibidas.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    badWords.splice(index, 1);

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: { badWordsList: JSON.stringify(badWords) },
    });

    const embed = successEmbed('Palavra Removida', `A palavra foi removida da lista de proibidas.\nTotal: ${badWords.length} palavra(s)`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleIgnore(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal');
    const role = interaction.options.getRole('cargo');

    if (!channel && !role) {
        const embed = errorEmbed('Erro', 'Você deve especificar um canal ou cargo para ignorar.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const ignoredChannels: string[] = settings?.ignoredChannels ? JSON.parse(settings.ignoredChannels) : [];
    const ignoredRoles: string[] = settings?.ignoredRoles ? JSON.parse(settings.ignoredRoles) : [];

    const added: string[] = [];

    if (channel && !ignoredChannels.includes(channel.id)) {
        ignoredChannels.push(channel.id);
        added.push(`Canal: ${channel}`);
    }

    if (role && !ignoredRoles.includes(role.id)) {
        ignoredRoles.push(role.id);
        added.push(`Cargo: ${role}`);
    }

    if (added.length === 0) {
        const embed = errorEmbed('Erro', 'Canal/cargo já está na lista de ignorados.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: {
            ignoredChannels: JSON.stringify(ignoredChannels),
            ignoredRoles: JSON.stringify(ignoredRoles),
        },
    });

    const embed = successEmbed('Ignorado', `Adicionado à lista de ignorados:\n${added.join('\n')}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUnignore(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('canal');
    const role = interaction.options.getRole('cargo');

    if (!channel && !role) {
        const embed = errorEmbed('Erro', 'Você deve especificar um canal ou cargo para remover.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const settings = await prisma.autoMod.findUnique({
        where: { guildId: interaction.guild!.id },
    });

    const ignoredChannels: string[] = settings?.ignoredChannels ? JSON.parse(settings.ignoredChannels) : [];
    const ignoredRoles: string[] = settings?.ignoredRoles ? JSON.parse(settings.ignoredRoles) : [];

    const removed: string[] = [];

    if (channel) {
        const index = ignoredChannels.indexOf(channel.id);
        if (index !== -1) {
            ignoredChannels.splice(index, 1);
            removed.push(`Canal: ${channel}`);
        }
    }

    if (role) {
        const index = ignoredRoles.indexOf(role.id);
        if (index !== -1) {
            ignoredRoles.splice(index, 1);
            removed.push(`Cargo: ${role}`);
        }
    }

    if (removed.length === 0) {
        const embed = errorEmbed('Erro', 'Canal/cargo não está na lista de ignorados.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await prisma.autoMod.update({
        where: { guildId: interaction.guild!.id },
        data: {
            ignoredChannels: JSON.stringify(ignoredChannels),
            ignoredRoles: JSON.stringify(ignoredRoles),
        },
    });

    const embed = successEmbed('Removido', `Removido da lista de ignorados:\n${removed.join('\n')}`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}
