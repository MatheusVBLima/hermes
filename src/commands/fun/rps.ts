import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { EmbedColors } from '../../utils/embeds.js';

type Choice = 'rock' | 'paper' | 'scissors';

const CHOICES: Record<Choice, { emoji: string; name: string; beats: Choice }> = {
    rock: { emoji: '🪨', name: 'Pedra', beats: 'scissors' },
    paper: { emoji: '📄', name: 'Papel', beats: 'rock' },
    scissors: { emoji: '✂️', name: 'Tesoura', beats: 'paper' },
};

export const data = new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Jogue pedra, papel ou tesoura contra o bot')
    .addStringOption((option) =>
        option
            .setName('escolha')
            .setDescription('Sua escolha')
            .setRequired(true)
            .addChoices(
                { name: '🪨 Pedra', value: 'rock' },
                { name: '📄 Papel', value: 'paper' },
                { name: '✂️ Tesoura', value: 'scissors' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const userChoice = interaction.options.getString('escolha', true) as Choice;
    const botChoice = Object.keys(CHOICES)[
        Math.floor(Math.random() * 3)
    ] as Choice;

    // Determinar resultado
    let result: 'win' | 'lose' | 'tie';
    let color: number;
    let title: string;

    if (userChoice === botChoice) {
        result = 'tie';
        color = EmbedColors.WARNING;
        title = '🤝 Empate!';
    } else if (CHOICES[userChoice].beats === botChoice) {
        result = 'win';
        color = EmbedColors.SUCCESS;
        title = '🎉 Você ganhou!';
    } else {
        result = 'lose';
        color = EmbedColors.ERROR;
        title = '😢 Você perdeu!';
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(
            {
                name: '👤 Sua Escolha',
                value: `${CHOICES[userChoice].emoji} **${CHOICES[userChoice].name}**`,
                inline: true,
            },
            {
                name: '🤖 Escolha do Bot',
                value: `${CHOICES[botChoice].emoji} **${CHOICES[botChoice].name}**`,
                inline: true,
            }
        )
        .setTimestamp();

    if (result === 'tie') {
        embed.setDescription('Ambos escolheram a mesma coisa!');
    } else if (result === 'win') {
        embed.setDescription(
            `${CHOICES[userChoice].name} vence ${CHOICES[botChoice].name}!`
        );
    } else {
        embed.setDescription(
            `${CHOICES[botChoice].name} vence ${CHOICES[userChoice].name}!`
        );
    }

    await interaction.reply({ embeds: [embed] });
}
