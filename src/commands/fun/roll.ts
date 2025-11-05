import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { EmbedColors } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Rolar dados de RPG (ex: 2d20, 1d6, 3d10)')
    .addStringOption((option) =>
        option
            .setName('dados')
            .setDescription('Formato: NdX (ex: 2d20 = 2 dados de 20 lados)')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const diceInput = interaction.options.getString('dados', true).toLowerCase();

    // Validar formato (XdY)
    const diceRegex = /^(\d+)d(\d+)$/;
    const match = diceInput.match(diceRegex);

    if (!match) {
        return await interaction.reply({
            content: '❌ Formato inválido! Use o formato **NdX** (ex: 2d20, 1d6, 3d10)',
            ephemeral: true,
        });
    }

    const numDice = parseInt(match[1]);
    const numSides = parseInt(match[2]);

    // Validações
    if (numDice < 1 || numDice > 100) {
        return await interaction.reply({
            content: '❌ Número de dados deve estar entre 1 e 100!',
            ephemeral: true,
        });
    }

    if (numSides < 2 || numSides > 1000) {
        return await interaction.reply({
            content: '❌ Número de lados deve estar entre 2 e 1000!',
            ephemeral: true,
        });
    }

    // Rolar dados
    const rolls: number[] = [];
    let total = 0;

    for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * numSides) + 1;
        rolls.push(roll);
        total += roll;
    }

    // Determinar cor baseado no resultado
    const maxPossible = numDice * numSides;
    const percentage = (total / maxPossible) * 100;

    let color: number;
    if (percentage >= 80) {
        color = EmbedColors.SUCCESS; // Excelente
    } else if (percentage >= 50) {
        color = EmbedColors.INFO; // Bom
    } else if (percentage >= 30) {
        color = EmbedColors.WARNING; // Regular
    } else {
        color = EmbedColors.ERROR; // Ruim
    }

    // Formatar resultados
    const rollsDisplay = rolls.length <= 20
        ? rolls.map(r => `\`${r}\``).join(' + ')
        : `${rolls.slice(0, 20).map(r => `\`${r}\``).join(' + ')} ... (+${rolls.length - 20} mais)`;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`🎲 Rolagem de Dados: ${diceInput.toUpperCase()}`)
        .addFields(
            {
                name: '🎯 Total',
                value: `**${total}**`,
                inline: true,
            },
            {
                name: '📊 Intervalo',
                value: `${numDice} - ${maxPossible}`,
                inline: true,
            },
            {
                name: '📈 Percentual',
                value: `${percentage.toFixed(1)}%`,
                inline: true,
            }
        );

    if (rolls.length <= 20) {
        embed.addFields({
            name: '🎲 Resultados',
            value: rollsDisplay,
            inline: false,
        });
    } else {
        embed.addFields({
            name: '🎲 Primeiros 20 Resultados',
            value: rollsDisplay,
            inline: false,
        });
    }

    embed.setFooter({ text: `Rolado por ${interaction.user.username}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
