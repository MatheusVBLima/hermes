import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Parar a música e limpar a fila');

export async function execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        const embed = errorEmbed('Erro', 'Você precisa estar em um canal de voz!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const distube = getDistube();
    const queue = distube.getQueue(interaction.guildId!);

    if (!queue) {
        const embed = errorEmbed('Erro', 'Não há nada tocando no momento!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    await queue.stop();

    const embed = successEmbed('⏹️ Parado', 'Música parada e fila limpa. Desconectado do canal de voz.');
    await interaction.reply({ embeds: [embed] });
}
