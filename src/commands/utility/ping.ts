import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get timestamp before API call
    const sent = await interaction.reply({
        embeds: [infoEmbed('Pinging...', 'Calculating latency...')],
        fetchReply: true,
    });

    // Calculate roundtrip latency
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;

    // Get WebSocket heartbeat (API latency)
    const wsLatency = interaction.client.ws.ping;

    // Determine latency quality
    const getLatencyQuality = (ms: number): string => {
        if (ms < 100) return '🟢 Excellent';
        if (ms < 200) return '🟡 Good';
        if (ms < 400) return '🟠 Fair';
        return '🔴 Poor';
    };

    const embed = infoEmbed('🏓 Pong!')
        .addFields(
            {
                name: 'Roundtrip Latency',
                value: `\`${roundtripLatency}ms\` ${getLatencyQuality(roundtripLatency)}`,
                inline: true,
            },
            {
                name: 'WebSocket Latency',
                value: `\`${wsLatency}ms\` ${getLatencyQuality(wsLatency)}`,
                inline: true,
            }
        )
        .setFooter({ text: 'Lower is better' });

    await interaction.editReply({ embeds: [embed] });
}
