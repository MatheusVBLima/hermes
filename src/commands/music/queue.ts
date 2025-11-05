import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { MusicManager } from '../../services/music/MusicManager.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Ver a fila de músicas')
    .addIntegerOption((option) =>
        option
            .setName('página')
            .setDescription('Número da página')
            .setRequired(false)
            .setMinValue(1)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = MusicManager.getPlayer(interaction.guildId!);

    if (!player.isConnected()) {
        const embed = errorEmbed('Erro', 'Não há nada na fila!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!player.currentSong && player.queue.length === 0) {
        const embed = errorEmbed('Erro', 'A fila está vazia!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const page = interaction.options.getInteger('página') || 1;
    const songsPerPage = 10;
    const start = (page - 1) * songsPerPage;
    const end = start + songsPerPage;

    const queueList = player.queue.slice(start, end);
    const totalPages = Math.ceil(player.queue.length / songsPerPage);

    let description = '';

    // Now playing
    if (player.currentSong) {
        description += `**🎵 Tocando Agora:**\n[${player.currentSong.title}](${player.currentSong.url})\n` +
            `Pedido por: ${player.currentSong.requestedBy.username}\n\n`;
    }

    // Queue
    if (queueList.length > 0) {
        description += `**📋 Próximas na Fila:**\n`;
        queueList.forEach((song, index) => {
            const position = start + index + 1;
            description += `\`${position}.\` [${song.title}](${song.url})\n` +
                `     Pedido por: ${song.requestedBy.username}\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('🎵 Fila de Músicas')
        .setDescription(description)
        .setFooter({
            text: `Página ${page}/${totalPages || 1} • ${player.queue.length} música(s) na fila`,
        })
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
