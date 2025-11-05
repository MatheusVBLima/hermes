import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Retomar a música pausada');

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

    if (!queue.paused) {
        const embed = errorEmbed('Erro', 'A música não está pausada!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    queue.resume();

    const embed = successEmbed('▶️ Retomado', 'Música retomada com sucesso!');
    await interaction.reply({ embeds: [embed] });
}
