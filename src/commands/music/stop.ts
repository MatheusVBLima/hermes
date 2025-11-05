import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { MusicManager } from '../../services/music/MusicManager.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Parar a música e limpar a fila');

export async function execute(interaction: ChatInputCommandInteraction) {
    const player = MusicManager.getPlayer(interaction.guildId!);

    if (!player.isConnected()) {
        const embed = errorEmbed('Erro', 'Não estou conectado a nenhum canal de voz!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    player.disconnect();
    MusicManager.removePlayer(interaction.guildId!);

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.SUCCESS)
        .setDescription('⏹️ Música parada e fila limpa. Desconectado do canal de voz.');

    await interaction.reply({ embeds: [embed] });
}
