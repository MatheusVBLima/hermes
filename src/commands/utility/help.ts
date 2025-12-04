import { SlashCommandBuilder, ChatInputCommandInteraction, Collection, MessageFlags } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra todos os comandos disponíveis e suas descrições')
    .addStringOption(option =>
        option
            .setName('command')
            .setDescription('Mostra detalhes de um comando específico')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandName = interaction.options.getString('command');

    // If specific command is requested
    if (commandName) {
        await showCommandDetails(interaction, commandName);
        return;
    }

    // Show all commands grouped by category
    await showAllCommands(interaction);
}

/**
 * Shows detailed information about a specific command
 */
async function showCommandDetails(
    interaction: ChatInputCommandInteraction,
    commandName: string
): Promise<void> {
    const command = interaction.client.commands?.get(commandName);

    if (!command) {
        await interaction.reply({
            embeds: [infoEmbed('Comando não encontrado', `O comando \`${commandName}\` não existe.`)],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const embed = infoEmbed(`Comando: /${command.data.name}`)
        .setDescription(command.data.description)
        .addFields({
            name: 'Uso',
            value: `\`/${command.data.name}\``,
            inline: false,
        });

    // Add options if any
    if (command.data.options && command.data.options.length > 0) {
        const options = command.data.options
            .map((opt: any) => `• \`${opt.name}\`: ${opt.description}`)
            .join('\n');
        embed.addFields({ name: 'Opções', value: options, inline: false });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Shows all commands grouped by category
 */
async function showAllCommands(interaction: ChatInputCommandInteraction): Promise<void> {
    const commands = interaction.client.commands;

    if (!commands || commands.size === 0) {
        await interaction.reply({
            embeds: [infoEmbed('Nenhum comando', 'Nenhum comando disponível no momento.')],
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    // Agrupar comandos por categoria (com base na pasta)
    const categories = new Map<string, Array<{ name: string; description: string }>>();

    commands.forEach((command) => {
        // Extrair categoria ou usar 'Utility' como padrão
        const category = (command as any).category || 'Utility';

        if (!categories.has(category)) {
            categories.set(category, []);
        }

        categories.get(category)?.push({
            name: command.data.name,
            description: command.data.description,
        });
    });

    // Construir embed
    const embed = infoEmbed('📚 Ajuda - Lista de comandos')
        .setDescription('Veja todos os comandos disponíveis. Use `/help <command>` para detalhes de um comando específico.');

    const categoryLabels: Record<string, string> = {
        'Utility': 'Utilidades',
        'Moderation': 'Moderação',
        'Economy': 'Economia',
        'Fun': 'Diversão',
        'Music': 'Música',
        'Games': 'Jogos',
        'Admin': 'Administração',
    };

    // Add fields for each category
    categories.forEach((commands, category) => {
        const commandList = commands
            .map(cmd => `• \`/${cmd.name}\` - ${cmd.description}`)
            .join('\n');

        embed.addFields({
            name: `${getCategoryEmoji(category)} ${categoryLabels[category] || category}`,
            value: commandList || 'Nenhum comando',
            inline: false,
        });
    });

    embed.setFooter({ text: `Total de comandos: ${commands.size}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * Gets emoji for command category
 */
function getCategoryEmoji(category: string): string {
    const emojis: Record<string, string> = {
        'Utility': '🔧',
        'Moderation': '🔨',
        'Economy': '💰',
        'Fun': '🎮',
        'Music': '🎵',
        'Games': '🎲',
        'Admin': '👑',
    };

    return emojis[category] || '📁';
}
