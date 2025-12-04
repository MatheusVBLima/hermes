import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, time, TimestampStyles } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Mostrar informações sobre um usuário')
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('Usuário para ver informações')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get target user (or the command user if no target specified)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    const embed = infoEmbed(`Informações do usuário: ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
        .addFields(
            {
                name: '👤 Usuário',
                value: targetUser.username,
                inline: true,
            },
            {
                name: '🔖 Discriminador',
                value: targetUser.discriminator,
                inline: true,
            },
            {
                name: '🆔 ID do usuário',
                value: `\`${targetUser.id}\``,
                inline: true,
            },
            {
                name: '🤖 Bot',
                value: targetUser.bot ? 'Sim' : 'Não',
                inline: true,
            },
            {
                name: '📅 Conta criada',
                value: time(targetUser.createdAt, TimestampStyles.RelativeTime),
                inline: true,
            }
        );

    // Add server-specific info if user is a member
    if (member) {
        embed.addFields(
            {
                name: '📥 Entrou no servidor',
                value: member.joinedAt ? time(member.joinedAt, TimestampStyles.RelativeTime) : 'Desconhecido',
                inline: true,
            },
            {
                name: '🎨 Apelido',
                value: member.nickname || 'Nenhum',
                inline: true,
            },
            {
                name: `📋 Cargos [${member.roles.cache.size - 1}]`,
                value: getRolesList(member),
                inline: false,
            }
        );

        // Set color to highest role color
        if (member.displayHexColor !== '#000000') {
            embed.setColor(member.displayHexColor as any);
        }
    }

    // Add user banner if available
    try {
        const fetchedUser = await targetUser.fetch();
        if (fetchedUser.bannerURL()) {
            embed.setImage(fetchedUser.bannerURL({ size: 1024 }) || '');
        }
    } catch (error) {
        // Banner fetch failed, continue without it
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * Gets formatted list of user roles
 */
function getRolesList(member: GuildMember): string {
    const roles = member.roles.cache
        .filter(role => role.id !== member.guild.id) // Filter @everyone role
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString());

    if (roles.length === 0) {
        return 'Nenhum';
    }

    // Limit to first 10 roles to avoid exceeding embed limits
    if (roles.length > 10) {
        const remaining = roles.length - 10;
        return roles.slice(0, 10).join(', ') + ` e mais ${remaining}...`;
    }

    return roles.join(', ');
}
