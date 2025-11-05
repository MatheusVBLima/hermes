import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MusicManager } from '../../services/music/MusicManager.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Pular a música atual');

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = MusicManager.getPlayer(interaction.guildId!);

    if (!player.isConnected() || !player.isPlaying) {
        const embed = errorEmbed('Erro', 'Não há nada tocando no momento!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const skippedSong = player.currentSong;
    player.skip();

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('⏭️ Música Pulada')
        .setDescription(skippedSong ? `**${skippedSong.title}**` : 'Música atual');

    await interaction.reply({ embeds: [embed] });
}
