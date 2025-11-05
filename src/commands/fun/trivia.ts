import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
} from 'discord.js';
import { EmbedColors } from '../../utils/embeds.js';

interface TriviaQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    category: string;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
    {
        question: 'Qual é a capital do Brasil?',
        options: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
        correctAnswer: 2,
        category: 'Geografia',
    },
    {
        question: 'Qual linguagem é usada para criar páginas web?',
        options: ['Python', 'HTML', 'Java', 'C++'],
        correctAnswer: 1,
        category: 'Programação',
    },
    {
        question: 'Quantos planetas existem no Sistema Solar?',
        options: ['7', '8', '9', '10'],
        correctAnswer: 1,
        category: 'Ciência',
    },
    {
        question: 'Qual é o maior oceano do mundo?',
        options: ['Atlântico', 'Índico', 'Ártico', 'Pacífico'],
        correctAnswer: 3,
        category: 'Geografia',
    },
    {
        question: 'Em que ano o Brasil foi descoberto?',
        options: ['1492', '1500', '1510', '1450'],
        correctAnswer: 1,
        category: 'História',
    },
    {
        question: 'Qual é o elemento químico de símbolo "Au"?',
        options: ['Prata', 'Ouro', 'Alumínio', 'Cobre'],
        correctAnswer: 1,
        category: 'Química',
    },
    {
        question: 'Quantas teclas tem um piano padrão?',
        options: ['76', '88', '92', '100'],
        correctAnswer: 1,
        category: 'Música',
    },
    {
        question: 'Qual é o maior animal terrestre?',
        options: ['Girafa', 'Elefante Africano', 'Rinoceronte', 'Hipopótamo'],
        correctAnswer: 1,
        category: 'Natureza',
    },
    {
        question: 'Quantos lados tem um hexágono?',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        category: 'Matemática',
    },
    {
        question: 'Qual é a linguagem de programação criada por Guido van Rossum?',
        options: ['JavaScript', 'Python', 'Ruby', 'PHP'],
        correctAnswer: 1,
        category: 'Programação',
    },
];

export const data = new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Responda uma pergunta de trivia!');

export async function execute(interaction: ChatInputCommandInteraction) {
    // Selecionar pergunta aleatória
    const question = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];

    // Criar botões para as opções
    const buttons = question.options.map((option, index) => {
        const labels = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        return new ButtonBuilder()
            .setCustomId(`trivia_${index}`)
            .setLabel(`${labels[index]} ${option}`)
            .setStyle(ButtonStyle.Primary);
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle('🧠 Trivia')
        .setDescription(`**${question.question}**`)
        .addFields({
            name: '📚 Categoria',
            value: question.category,
            inline: true,
        })
        .setFooter({ text: 'Você tem 30 segundos para responder!' })
        .setTimestamp();

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
    });

    // Aguardar resposta
    try {
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000,
        });

        let answered = false;

        collector.on('collect', async (i) => {
            // Apenas quem iniciou pode responder
            if (i.user.id !== interaction.user.id) {
                return await i.reply({
                    content: '❌ Esta pergunta não é para você!',
                    ephemeral: true,
                });
            }

            if (answered) {
                return await i.reply({
                    content: '❌ Você já respondeu!',
                    ephemeral: true,
                });
            }

            answered = true;
            collector.stop();

            const selectedAnswer = parseInt(i.customId.split('_')[1]);
            const correct = selectedAnswer === question.correctAnswer;

            // Desabilitar botões
            const disabledButtons = question.options.map((option, index) => {
                const labels = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
                const button = new ButtonBuilder()
                    .setCustomId(`trivia_disabled_${index}`)
                    .setLabel(`${labels[index]} ${option}`)
                    .setDisabled(true);

                if (index === question.correctAnswer) {
                    button.setStyle(ButtonStyle.Success);
                } else if (index === selectedAnswer && !correct) {
                    button.setStyle(ButtonStyle.Danger);
                } else {
                    button.setStyle(ButtonStyle.Secondary);
                }

                return button;
            });

            const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                disabledButtons
            );

            const resultEmbed = new EmbedBuilder()
                .setColor(correct ? EmbedColors.SUCCESS : EmbedColors.ERROR)
                .setTitle(correct ? '✅ Correto!' : '❌ Incorreto!')
                .setDescription(`**${question.question}**`)
                .addFields(
                    {
                        name: '📚 Categoria',
                        value: question.category,
                        inline: true,
                    },
                    {
                        name: '✅ Resposta Correta',
                        value: question.options[question.correctAnswer],
                        inline: true,
                    }
                )
                .setFooter({ text: `Respondido por ${interaction.user.username}` })
                .setTimestamp();

            await i.update({
                embeds: [resultEmbed],
                components: [disabledRow],
            });
        });

        collector.on('end', async (collected) => {
            if (!answered) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(EmbedColors.WARNING)
                    .setTitle('⏰ Tempo Esgotado!')
                    .setDescription(`**${question.question}**`)
                    .addFields(
                        {
                            name: '📚 Categoria',
                            value: question.category,
                            inline: true,
                        },
                        {
                            name: '✅ Resposta Correta',
                            value: question.options[question.correctAnswer],
                            inline: true,
                        }
                    )
                    .setTimestamp();

                const disabledButtons = question.options.map((option, index) => {
                    const labels = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
                    return new ButtonBuilder()
                        .setCustomId(`trivia_timeout_${index}`)
                        .setLabel(`${labels[index]} ${option}`)
                        .setStyle(
                            index === question.correctAnswer
                                ? ButtonStyle.Success
                                : ButtonStyle.Secondary
                        )
                        .setDisabled(true);
                });

                const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    disabledButtons
                );

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [disabledRow],
                });
            }
        });
    } catch (error) {
        console.error('Error in trivia collector:', error);
    }
}
