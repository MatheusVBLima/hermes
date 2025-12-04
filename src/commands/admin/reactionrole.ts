import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    TextChannel,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Role,
} from 'discord.js';
import { prisma } from '../../services/database.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Gerenciar cargos por reação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Criar uma nova mensagem de reaction role')
            .addStringOption(option =>
                option
                    .setName('titulo')
                    .setDescription('Título do embed')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('descricao')
                    .setDescription('Descrição do embed')
                    .setRequired(true)
            )
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal onde a mensagem será enviada')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('Adicionar um cargo a uma mensagem existente')
            .addStringOption(option =>
                option
                    .setName('mensagem_id')
                    .setDescription('ID da mensagem de reaction role')
                    .setRequired(true)
            )
            .addRoleOption(option =>
                option
                    .setName('cargo')
                    .setDescription('Cargo a ser adicionado')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('emoji')
                    .setDescription('Emoji para a reação (ex: 🎮 ou emoji customizado)')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('descricao')
                    .setDescription('Descrição do cargo (opcional)')
                    .setRequired(false)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remover um cargo de uma mensagem')
            .addStringOption(option =>
                option
                    .setName('mensagem_id')
                    .setDescription('ID da mensagem de reaction role')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('emoji')
                    .setDescription('Emoji da reação a remover')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('Listar todos os reaction roles do servidor')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'create':
                await handleCreate(interaction);
                break;
            case 'add':
                await handleAdd(interaction);
                break;
            case 'remove':
                await handleRemove(interaction);
                break;
            case 'list':
                await handleList(interaction);
                break;
        }
    } catch (error) {
        logger.error('Error in reactionrole command:', error);
        const embed = errorEmbed('Erro', 'Ocorreu um erro ao executar o comando.');

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
    const titulo = interaction.options.getString('titulo', true);
    const descricao = interaction.options.getString('descricao', true);
    const canal = interaction.options.getChannel('canal') as TextChannel | null;
    const targetChannel = canal || interaction.channel as TextChannel;

    if (!targetChannel || !targetChannel.isTextBased()) {
        const embed = errorEmbed('Erro', 'Canal inválido ou não é um canal de texto.');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Create the reaction role embed
    const embed = new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descricao + '\n\n*Reaja para receber um cargo!*')
        .setColor(0x5865F2)
        .setFooter({ text: 'Clique nas reações abaixo para receber os cargos' })
        .setTimestamp();

    const message = await targetChannel.send({ embeds: [embed] });

    const successMsg = successEmbed(
        'Mensagem Criada',
        `Mensagem de reaction role criada com sucesso!\n\n**Canal:** ${targetChannel}\n**ID da Mensagem:** \`${message.id}\`\n\nUse \`/reactionrole add\` para adicionar cargos a esta mensagem.`
    );

    await interaction.reply({ embeds: [successMsg], ephemeral: true });
    logger.info(`[ReactionRole] Created new message ${message.id} in ${targetChannel.name} by ${interaction.user.tag}`);
}

async function handleAdd(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('mensagem_id', true);
    const role = interaction.options.getRole('cargo', true) as Role;
    const emoji = interaction.options.getString('emoji', true);
    const descricao = interaction.options.getString('descricao');

    // Check if bot can manage this role
    const botMember = interaction.guild!.members.me;
    if (!botMember) {
        const embed = errorEmbed('Erro', 'Não foi possível verificar as permissões do bot.');
        return await interaction.editReply({ embeds: [embed] });
    }

    if (role.position >= botMember.roles.highest.position) {
        const embed = errorEmbed('Erro', 'Não posso gerenciar este cargo pois está acima ou igual ao meu cargo mais alto.');
        return await interaction.editReply({ embeds: [embed] });
    }

    if (role.managed) {
        const embed = errorEmbed('Erro', 'Este cargo é gerenciado por uma integração e não pode ser atribuído manualmente.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Find the message
    let message;
    try {
        // Try to find in all text channels
        const channels = interaction.guild!.channels.cache.filter(c => c.isTextBased());

        for (const [, channel] of channels) {
            try {
                const textChannel = channel as TextChannel;
                message = await textChannel.messages.fetch(messageId);
                if (message) break;
            } catch {
                // Continue searching
            }
        }

        if (!message) {
            const embed = errorEmbed('Erro', 'Mensagem não encontrada. Verifique se o ID está correto.');
            return await interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        const embed = errorEmbed('Erro', 'Não foi possível encontrar a mensagem.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Check if this emoji is already used for this message
    const existing = await prisma.reactionRole.findUnique({
        where: {
            messageId_emoji: {
                messageId: messageId,
                emoji: emoji,
            },
        },
    });

    if (existing) {
        const embed = errorEmbed('Erro', 'Este emoji já está sendo usado nesta mensagem.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Add reaction to message
    try {
        await message.react(emoji);
    } catch (error) {
        const embed = errorEmbed('Erro', 'Não foi possível adicionar a reação. Verifique se o emoji é válido.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Save to database
    await prisma.reactionRole.create({
        data: {
            guildId: interaction.guild!.id,
            channelId: message.channel.id,
            messageId: messageId,
            emoji: emoji,
            roleId: role.id,
        },
    });

    // Update the embed with the new role
    const currentEmbed = message.embeds[0];
    if (currentEmbed) {
        const currentDescription = currentEmbed.description || '';
        const roleEntry = `\n${emoji} - ${role.name}${descricao ? ` - ${descricao}` : ''}`;

        // Check if this is the original embed (has the footer text)
        const newDescription = currentDescription.includes('*Reaja para receber um cargo!*')
            ? currentDescription.replace('*Reaja para receber um cargo!*', `${roleEntry}\n\n*Reaja para receber um cargo!*`)
            : currentDescription + roleEntry;

        const updatedEmbed = EmbedBuilder.from(currentEmbed).setDescription(newDescription);
        await message.edit({ embeds: [updatedEmbed] });
    }

    const successMsg = successEmbed(
        'Cargo Adicionado',
        `Cargo adicionado com sucesso!\n\n**Emoji:** ${emoji}\n**Cargo:** ${role}\n**Mensagem:** \`${messageId}\``
    );

    await interaction.editReply({ embeds: [successMsg] });
    logger.info(`[ReactionRole] Added role ${role.name} with emoji ${emoji} to message ${messageId} by ${interaction.user.tag}`);
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('mensagem_id', true);
    const emoji = interaction.options.getString('emoji', true);

    // Find in database
    const reactionRole = await prisma.reactionRole.findUnique({
        where: {
            messageId_emoji: {
                messageId: messageId,
                emoji: emoji,
            },
        },
    });

    if (!reactionRole) {
        const embed = errorEmbed('Erro', 'Reaction role não encontrado.');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Delete from database
    await prisma.reactionRole.delete({
        where: {
            id: reactionRole.id,
        },
    });

    // Try to remove reaction from message
    try {
        const channel = await interaction.guild!.channels.fetch(reactionRole.channelId) as TextChannel;
        const message = await channel.messages.fetch(messageId);
        const reaction = message.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
        if (reaction) {
            await reaction.remove();
        }
    } catch (error) {
        logger.warn(`[ReactionRole] Could not remove reaction from message: ${error}`);
    }

    const successMsg = successEmbed(
        'Cargo Removido',
        `Reaction role removido com sucesso!\n\n**Emoji:** ${emoji}\n**Mensagem:** \`${messageId}\``
    );

    await interaction.editReply({ embeds: [successMsg] });
    logger.info(`[ReactionRole] Removed emoji ${emoji} from message ${messageId} by ${interaction.user.tag}`);
}

async function handleList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const reactionRoles = await prisma.reactionRole.findMany({
        where: {
            guildId: interaction.guild!.id,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    if (reactionRoles.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('Reaction Roles')
            .setDescription('Nenhum reaction role configurado neste servidor.')
            .setColor(0x5865F2);

        return await interaction.editReply({ embeds: [embed] });
    }

    // Group by message
    const grouped = reactionRoles.reduce((acc, rr) => {
        if (!acc[rr.messageId]) {
            acc[rr.messageId] = [];
        }
        acc[rr.messageId].push(rr);
        return acc;
    }, {} as Record<string, typeof reactionRoles>);

    let description = '';
    for (const [msgId, roles] of Object.entries(grouped)) {
        const channelId = roles[0].channelId;
        description += `**Mensagem:** \`${msgId}\`\n**Canal:** <#${channelId}>\n`;

        for (const rr of roles) {
            const role = interaction.guild!.roles.cache.get(rr.roleId);
            description += `${rr.emoji} → ${role ? role.name : 'Cargo deletado'}\n`;
        }
        description += '\n';
    }

    const embed = new EmbedBuilder()
        .setTitle('Reaction Roles')
        .setDescription(description)
        .setColor(0x5865F2)
        .setFooter({ text: `Total: ${reactionRoles.length} reaction role(s)` });

    await interaction.editReply({ embeds: [embed] });
}
