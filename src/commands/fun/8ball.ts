import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { EmbedColors } from '../../utils/embeds.js';

const RESPONSES = [
    // Respostas positivas
    'Sim, definitivamente!',
    'É certo.',
    'Sem dúvida.',
    'Sim, com certeza.',
    'Pode contar com isso.',
    'Como eu vejo, sim.',
    'Muito provável.',
    'Perspectiva boa.',
    'Sim.',
    'Os sinais apontam para sim.',

    // Respostas incertas
    'Resposta nebulosa, tente novamente.',
    'Pergunte novamente mais tarde.',
    'Melhor não te dizer agora.',
    'Não posso prever agora.',
    'Concentre-se e pergunte novamente.',

    // Respostas negativas
    'Não conte com isso.',
    'Minha resposta é não.',
    'Minhas fontes dizem que não.',
    'Perspectiva não tão boa.',
    'Muito duvidoso.',
];

export const data = new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Faça uma pergunta à bola mágica 8')
    .addStringOption((option) =>
        option
            .setName('pergunta')
            .setDescription('Sua pergunta para a bola mágica')
            .setRequired(true)
            .setMaxLength(200)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('pergunta', true);
    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];

    // Determinar cor baseado na resposta
    let color: number;
    const responseIndex = RESPONSES.indexOf(response);

    if (responseIndex < 10) {
        color = EmbedColors.SUCCESS; // Positiva
    } else if (responseIndex < 15) {
        color = EmbedColors.WARNING; // Incerta
    } else {
        color = EmbedColors.ERROR; // Negativa
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎱 Bola Mágica 8')
        .addFields(
            {
                name: '❓ Pergunta',
                value: question,
                inline: false,
            },
            {
                name: '💬 Resposta',
                value: `*${response}*`,
                inline: false,
            }
        )
        .setFooter({ text: `Perguntado por ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
