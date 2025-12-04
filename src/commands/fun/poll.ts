import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';
import { logger } from '../../utils/logger.js';

// Store active polls in memory (for simplicity, could use database for persistence)
const activePolls = new Map<string, {
    question: string;
    options: string[];
    votes: Map<string, number>; // Map<userId, optionIndex>
    endsAt: Date | null;
    creatorId: string;
}>();

const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

export const data = new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Criar uma enquete')
    .addStringOption(option =>
        option
            .setName('pergunta')
            .setDescription('A pergunta da enquete')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('opcao1')
            .setDescription('Primeira opção')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('opcao2')
            .setDescription('Segunda opção')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('opcao3')
            .setDescription('Terceira opção (opcional)')
    )
    .addStringOption(option =>
        option
            .setName('opcao4')
            .setDescription('Quarta opção (opcional)')
    )
    .addStringOption(option =>
        option
            .setName('opcao5')
            .setDescription('Quinta opção (opcional)')
    )
    .addIntegerOption(option =>
        option
            .setName('duracao')
            .setDescription('Duração em minutos (opcional, padrão: sem limite)')
            .setMinValue(1)
            .setMaxValue(1440) // 24 hours
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('pergunta', true);
    const duracao = interaction.options.getInteger('duracao');

    // Collect options
    const options: string[] = [];
    for (let i = 1; i <= 5; i++) {
        const option = interaction.options.getString(`opcao${i}`);
        if (option) options.push(option);
    }

    const endsAt = duracao ? new Date(Date.now() + duracao * 60 * 1000) : null;

    // Create embed
    const embed = createPollEmbed(question, options, new Map(), endsAt, interaction.user.id);

    // Create buttons for voting
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    let currentRow = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < options.length; i++) {
        if (i > 0 && i % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>();
        }

        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`poll_vote_${i}`)
                .setLabel(POLL_EMOJIS[i])
                .setStyle(ButtonStyle.Primary)
        );
    }
    rows.push(currentRow);

    // Add end poll button
    const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('poll_end')
            .setLabel('Encerrar Enquete')
            .setStyle(ButtonStyle.Danger)
    );
    rows.push(controlRow);

    const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });

    // Store poll data
    activePolls.set(message.id, {
        question,
        options,
        votes: new Map(),
        endsAt,
        creatorId: interaction.user.id,
    });

    logger.info(`[Poll] Created poll "${question}" by ${interaction.user.tag}`);

    // Schedule end if duration is set
    if (duracao && endsAt) {
        setTimeout(() => {
            endPoll(message.id, interaction.channel!);
        }, duracao * 60 * 1000);
    }
}

function createPollEmbed(
    question: string,
    options: string[],
    votes: Map<string, number>,
    endsAt: Date | null,
    creatorId: string
): EmbedBuilder {
    const totalVotes = votes.size;
    const voteCounts = new Array(options.length).fill(0);

    votes.forEach(optionIndex => {
        voteCounts[optionIndex]++;
    });

    let description = '';
    for (let i = 0; i < options.length; i++) {
        const voteCount = voteCounts[i];
        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
        const barLength = Math.round(percentage / 10);
        const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);

        description += `${POLL_EMOJIS[i]} **${options[i]}**\n`;
        description += `${bar} ${voteCount} voto(s) (${percentage}%)\n\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${question}`)
        .setDescription(description)
        .setColor(0x5865F2)
        .setFooter({ text: `Total: ${totalVotes} voto(s) • Criado por` })
        .setTimestamp();

    if (endsAt) {
        embed.addFields({
            name: '⏰ Termina em',
            value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`,
            inline: true,
        });
    }

    return embed;
}

// Export for use in button handler
export async function handlePollVote(
    interaction: any,
    optionIndex: number
): Promise<void> {
    const poll = activePolls.get(interaction.message.id);

    if (!poll) {
        await interaction.reply({
            content: 'Esta enquete não existe mais ou já foi encerrada.',
            ephemeral: true,
        });
        return;
    }

    // Check if poll has ended
    if (poll.endsAt && new Date() > poll.endsAt) {
        await interaction.reply({
            content: 'Esta enquete já foi encerrada!',
            ephemeral: true,
        });
        return;
    }

    const previousVote = poll.votes.get(interaction.user.id);

    if (previousVote === optionIndex) {
        // Remove vote
        poll.votes.delete(interaction.user.id);
        await interaction.reply({
            content: `Você removeu seu voto de **${poll.options[optionIndex]}**`,
            ephemeral: true,
        });
    } else {
        // Add/change vote
        poll.votes.set(interaction.user.id, optionIndex);

        if (previousVote !== undefined) {
            await interaction.reply({
                content: `Você mudou seu voto de **${poll.options[previousVote]}** para **${poll.options[optionIndex]}**`,
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                content: `Você votou em **${poll.options[optionIndex]}**`,
                ephemeral: true,
            });
        }
    }

    // Update embed
    const embed = createPollEmbed(
        poll.question,
        poll.options,
        poll.votes,
        poll.endsAt,
        poll.creatorId
    );

    await interaction.message.edit({ embeds: [embed] });
}

export async function handlePollEnd(interaction: any): Promise<void> {
    const poll = activePolls.get(interaction.message.id);

    if (!poll) {
        await interaction.reply({
            content: 'Esta enquete não existe mais.',
            ephemeral: true,
        });
        return;
    }

    // Check if user is the creator or has manage messages permission
    const member = interaction.member;
    if (poll.creatorId !== interaction.user.id && !member.permissions.has('ManageMessages')) {
        await interaction.reply({
            content: 'Apenas o criador da enquete ou moderadores podem encerrá-la.',
            ephemeral: true,
        });
        return;
    }

    await endPoll(interaction.message.id, interaction.channel);
    await interaction.reply({
        content: 'Enquete encerrada!',
        ephemeral: true,
    });
}

async function endPoll(messageId: string, channel: any): Promise<void> {
    const poll = activePolls.get(messageId);
    if (!poll) return;

    try {
        const message = await channel.messages.fetch(messageId);

        // Create final embed
        const embed = createPollEmbed(
            poll.question,
            poll.options,
            poll.votes,
            null,
            poll.creatorId
        )
            .setTitle(`📊 [ENCERRADA] ${poll.question}`)
            .setColor(0x95A5A6);

        // Find winner(s)
        const voteCounts = new Array(poll.options.length).fill(0);
        poll.votes.forEach(optionIndex => {
            voteCounts[optionIndex]++;
        });

        const maxVotes = Math.max(...voteCounts);
        if (maxVotes > 0) {
            const winners = poll.options.filter((_, i) => voteCounts[i] === maxVotes);
            embed.addFields({
                name: '🏆 Resultado',
                value: winners.length > 1
                    ? `Empate entre: ${winners.join(', ')}`
                    : `Vencedor: **${winners[0]}** com ${maxVotes} voto(s)`,
            });
        }

        // Disable all buttons
        const disabledRows = message.components.map((row: any) => {
            const newRow = new ActionRowBuilder<ButtonBuilder>();
            row.components.forEach((button: any) => {
                newRow.addComponents(
                    ButtonBuilder.from(button).setDisabled(true)
                );
            });
            return newRow;
        });

        await message.edit({ embeds: [embed], components: disabledRows });

        // Remove from active polls
        activePolls.delete(messageId);

        logger.info(`[Poll] Ended poll "${poll.question}"`);
    } catch (error) {
        logger.error('[Poll] Error ending poll:', error);
    }
}

// Export the activePolls map for the button handler
export { activePolls };
