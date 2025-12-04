import { SlashCommandBuilder, ChatInputCommandInteraction, time, TimestampStyles, GuildVerificationLevel } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Exibir informações sobre este servidor');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({
            content: 'Este comando só pode ser usado em um servidor.',
            ephemeral: true,
        });
        return;
    }

    // Fetch complete guild data for accurate counts
    await guild.fetch();

    // Get owner
    const owner = await guild.fetchOwner();

    // Get counts
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const totalChannels = textChannels + voiceChannels;

    // Get member stats
    const members = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = members - bots;

    // Get boost info
    const boostTier = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const embed = infoEmbed(`Informações do servidor: ${guild.name}`)
        .setThumbnail(guild.iconURL({ size: 256 }) || '')
        .addFields(
            {
                name: '👑 Dono',
                value: `${owner.user.tag}`,
                inline: true,
            },
            {
                name: '🆔 ID do servidor',
                value: `\`${guild.id}\``,
                inline: true,
            },
            {
                name: '📅 Criado',
                value: time(guild.createdAt, TimestampStyles.RelativeTime),
                inline: true,
            },
            {
                name: '👥 Membros',
                value: [
                    `Total: **${members}**`,
                    `Humanos: **${humans}**`,
                    `Bots: **${bots}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '📺 Canais',
                value: [
                    `Total: **${totalChannels}**`,
                    `Texto: **${textChannels}**`,
                    `Voz: **${voiceChannels}**`,
                    `Categorias: **${categories}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '📋 Outros',
                value: [
                    `Roles: **${guild.roles.cache.size}**`,
                    `Emojis: **${guild.emojis.cache.size}**`,
                    `Stickers: **${guild.stickers.cache.size}**`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔒 Nível de verificação',
                value: getVerificationLevel(guild.verificationLevel),
                inline: true,
            },
            {
                name: '💎 Boosts',
                value: [
                    `Nível: **${boostTier}**`,
                    `Boosts: **${boostCount}**`,
                ].join('\n'),
                inline: true,
            }
        );

    // Add server banner if available
    if (guild.bannerURL()) {
        embed.setImage(guild.bannerURL({ size: 1024 }) || '');
    }

    // Add description if available
    if (guild.description) {
        embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * Converts verification level to readable format
 */
function getVerificationLevel(level: GuildVerificationLevel): string {
    const levels: Record<GuildVerificationLevel, string> = {
        [GuildVerificationLevel.None]: 'Nenhum',
        [GuildVerificationLevel.Low]: 'Baixo',
        [GuildVerificationLevel.Medium]: 'Médio',
        [GuildVerificationLevel.High]: 'Alto',
        [GuildVerificationLevel.VeryHigh]: 'Muito alto',
    };

    return levels[level] || 'Desconhecido';
}
