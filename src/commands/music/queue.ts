import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
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
    const distube = getDistube();
    const queue = distube.getQueue(interaction.guildId!);

    if (!queue) {
        const embed = errorEmbed('Erro', 'Não há nada na fila!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const page = interaction.options.getInteger('página') || 1;
    const songsPerPage = 10;
    const start = (page - 1) * songsPerPage;
    const end = start + songsPerPage;

    const songs = queue.songs.slice(1); // Exclude current song
    const queueList = songs.slice(start, end);
    const totalPages = Math.ceil(songs.length / songsPerPage);

    let description = '';

    // Now playing
    const current = queue.songs[0];
    description += `**🎵 Tocando Agora:**\n[${current.name}](${current.url})\n` +
        `Pedido por: ${current.user?.username || 'Desconhecido'}\n\n`;

    // Queue
    if (queueList.length > 0) {
        description += `**📋 Próximas na Fila:**\n`;
        queueList.forEach((song, index) => {
            const position = start + index + 1;
            description += `\`${position}.\` [${song.name}](${song.url})\n` +
                `     Pedido por: ${song.user?.username || 'Desconhecido'}\n`;
        });
    } else if (songs.length === 0) {
        description += `**📋 A fila está vazia!**`;
    }

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('🎵 Fila de Músicas')
        .setDescription(description)
        .setFooter({
            text: `Página ${page}/${totalPages || 1} • ${songs.length} música(s) na fila`,
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
