import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verificar a latência do bot e o tempo de resposta da API');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get timestamp before API call
    const sent = await interaction.reply({
        embeds: [infoEmbed('🏓 Testando...', 'Calculando latência...')],
        fetchReply: true,
    });

    // Calculate roundtrip latency
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;

    // Get WebSocket heartbeat (API latency)
    const wsLatency = interaction.client.ws.ping;

    // Determine latency quality
    const getLatencyQuality = (ms: number): string => {
        if (ms < 100) return '🟢 Excelente';
        if (ms < 200) return '🟡 Boa';
        if (ms < 400) return '🟠 Ok';
        return '🔴 Ruim';
    };

    const embed = infoEmbed('🏓 Pong!')
        .addFields(
            {
                name: 'Latência de ida e volta',
                value: `\`${roundtripLatency}ms\` ${getLatencyQuality(roundtripLatency)}`,
                inline: true,
            },
            {
                name: 'Latência do WebSocket',
                value: `\`${wsLatency}ms\` ${getLatencyQuality(wsLatency)}`,
                inline: true,
            }
        )
        .setFooter({ text: 'Quanto menor, melhor' });

    await interaction.editReply({ embeds: [embed] });
}
