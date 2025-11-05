import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Ver a música que está tocando agora');

export async function execute(interaction: ChatInputCommandInteraction) {
    const distube = getDistube();
    const queue = distube.getQueue(interaction.guildId!);

    if (!queue) {
        const embed = errorEmbed('Erro', 'Não há nada tocando no momento!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const song = queue.songs[0];

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('🎵 Tocando Agora')
        .setDescription(`[${song.name}](${song.url})`)
        .setThumbnail(song.thumbnail || '')
        .addFields(
            {
                name: '⏱️ Duração',
                value: song.formattedDuration,
                inline: true,
            },
            {
                name: '👤 Pedido por',
                value: song.user?.username || 'Desconhecido',
                inline: true,
            },
            {
                name: '📊 Fila',
                value: `${queue.songs.length - 1} música(s)`,
                inline: true,
            },
            {
                name: '▶️ Status',
                value: queue.paused ? 'Pausado' : 'Tocando',
                inline: true,
            }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
