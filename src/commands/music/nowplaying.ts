import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MusicManager } from '../../services/music/MusicManager.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Ver a música que está tocando agora');

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = MusicManager.getPlayer(interaction.guildId!);

    if (!player.isConnected() || !player.currentSong) {
        const embed = errorEmbed('Erro', 'Não há nada tocando no momento!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const song = player.currentSong;
    const duration = formatDuration(song.duration);

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('🎵 Tocando Agora')
        .setDescription(`[${song.title}](${song.url})`)
        .setThumbnail(song.thumbnail)
        .addFields(
            {
                name: '⏱️ Duração',
                value: duration,
                inline: true,
            },
            {
                name: '👤 Pedido por',
                value: song.requestedBy.username,
                inline: true,
            },
            {
                name: '📊 Fila',
                value: `${player.queue.length} música(s)`,
                inline: true,
            },
            {
                name: '▶️ Status',
                value: player.isPaused ? 'Pausado' : 'Tocando',
                inline: true,
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
