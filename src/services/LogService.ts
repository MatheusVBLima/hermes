import { EmbedBuilder, TextChannel, Guild, GuildMember, Message, User, VoiceState } from 'discord.js';
import { prisma } from './database.js';
import { logger } from '../utils/logger.js';

export async function sendLog(
    guild: Guild,
    type: 'messages' | 'members' | 'moderation' | 'voice',
    embed: EmbedBuilder
): Promise<void> {
    try {
        const guildData = await prisma.guild.findUnique({
            where: { id: guild.id },
        });

        if (!guildData?.logChannelId) return;

        // Check if this log type is enabled
        const typeEnabled = {
            messages: guildData.logMessages,
            members: guildData.logMembers,
            moderation: guildData.logModeration,
            voice: guildData.logVoice,
        };

        if (!typeEnabled[type]) return;

        const channel = guild.channels.cache.get(guildData.logChannelId) as TextChannel;
        if (!channel) return;

        await channel.send({ embeds: [embed] });
    } catch (error) {
        logger.error('[LogService] Error sending log:', error);
    }
}

// Message deleted log
export async function logMessageDelete(message: Message): Promise<void> {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
        .setTitle('Mensagem Deletada')
        .setColor(0xED4245)
        .addFields(
            { name: 'Autor', value: `${message.author?.tag || 'Desconhecido'} (${message.author?.id || 'N/A'})`, inline: true },
            { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Conteúdo', value: message.content?.slice(0, 1024) || '*Sem conteúdo de texto*' }
        )
        .setTimestamp();

    if (message.attachments.size > 0) {
        embed.addFields({
            name: 'Anexos',
            value: message.attachments.map(a => a.name).join(', ')
        });
    }

    await sendLog(message.guild, 'messages', embed);
}

// Message edited log
export async function logMessageEdit(oldMessage: Message, newMessage: Message): Promise<void> {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
        .setTitle('Mensagem Editada')
        .setColor(0xFEE75C)
        .addFields(
            { name: 'Autor', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
            { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
            { name: 'Antes', value: oldMessage.content?.slice(0, 1024) || '*Vazio*' },
            { name: 'Depois', value: newMessage.content?.slice(0, 1024) || '*Vazio*' }
        )
        .setURL(newMessage.url)
        .setTimestamp();

    await sendLog(newMessage.guild, 'messages', embed);
}

// Member join log
export async function logMemberJoin(member: GuildMember): Promise<void> {
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const isNewAccount = accountAge < 7;

    const embed = new EmbedBuilder()
        .setTitle('Membro Entrou')
        .setColor(0x57F287)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Usuário', value: `${member.user.tag}`, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'Conta Criada', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: 'Membros', value: `${member.guild.memberCount}`, inline: true }
        )
        .setTimestamp();

    if (isNewAccount) {
        embed.addFields({
            name: '⚠️ Aviso',
            value: `Conta nova (${accountAge} dias)`
        });
    }

    await sendLog(member.guild, 'members', embed);
}

// Member leave log
export async function logMemberLeave(member: GuildMember): Promise<void> {
    const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => r.name)
        .slice(0, 10);

    const embed = new EmbedBuilder()
        .setTitle('Membro Saiu')
        .setColor(0xED4245)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: 'Usuário', value: `${member.user.tag}`, inline: true },
            { name: 'ID', value: member.id, inline: true },
            { name: 'Entrou em', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>` : 'Desconhecido', inline: true },
            { name: 'Cargos', value: roles.length > 0 ? roles.join(', ') : 'Nenhum', inline: false }
        )
        .setTimestamp();

    await sendLog(member.guild, 'members', embed);
}

// Moderation action log
export async function logModAction(
    guild: Guild,
    action: string,
    moderator: User,
    target: User | GuildMember,
    reason?: string,
    duration?: string
): Promise<void> {
    const actionColors: Record<string, number> = {
        ban: 0xED4245,
        kick: 0xFEE75C,
        timeout: 0xEB459E,
        warn: 0xF0B232,
        unban: 0x57F287,
    };

    const actionEmojis: Record<string, string> = {
        ban: '🔨',
        kick: '👢',
        timeout: '🔇',
        warn: '⚠️',
        unban: '✅',
    };

    const targetUser = target instanceof GuildMember ? target.user : target;

    const embed = new EmbedBuilder()
        .setTitle(`${actionEmojis[action] || '📋'} ${action.charAt(0).toUpperCase() + action.slice(1)}`)
        .setColor(actionColors[action] || 0x5865F2)
        .addFields(
            { name: 'Usuário', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
            { name: 'Moderador', value: `${moderator.tag}`, inline: true }
        )
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

    if (reason) {
        embed.addFields({ name: 'Motivo', value: reason });
    }

    if (duration) {
        embed.addFields({ name: 'Duração', value: duration, inline: true });
    }

    await sendLog(guild, 'moderation', embed);
}

// Voice state log
export async function logVoiceUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guild = newState.guild;

    let title: string;
    let color: number;
    let description: string;

    if (!oldState.channel && newState.channel) {
        // Joined voice channel
        title = '🔊 Entrou em Canal de Voz';
        color = 0x57F287;
        description = `${member.user.tag} entrou em **${newState.channel.name}**`;
    } else if (oldState.channel && !newState.channel) {
        // Left voice channel
        title = '🔇 Saiu de Canal de Voz';
        color = 0xED4245;
        description = `${member.user.tag} saiu de **${oldState.channel.name}**`;
    } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        // Moved voice channels
        title = '🔀 Mudou de Canal de Voz';
        color = 0xFEE75C;
        description = `${member.user.tag} moveu de **${oldState.channel.name}** para **${newState.channel.name}**`;
    } else {
        return; // Other state changes (mute, deaf, etc.)
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();

    await sendLog(guild, 'voice', embed);
}
