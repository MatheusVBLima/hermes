import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MusicManager } from '../../services/music/MusicManager.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausar a música atual');

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = MusicManager.getPlayer(interaction.guildId!);

    if (!player.isConnected() || !player.isPlaying) {
        const embed = errorEmbed('Erro', 'Não há nada tocando no momento!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (player.isPaused) {
        const embed = errorEmbed('Erro', 'A música já está pausada!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    player.pause();

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.WARNING)
        .setDescription('⏸️ Música pausada');

    await interaction.reply({ embeds: [embed] });
}
