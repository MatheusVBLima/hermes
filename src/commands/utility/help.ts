import { SlashCommandBuilder, ChatInputCommandInteraction, Collection } from 'discord.js';
import { infoEmbed } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display all available commands and their descriptions')
    .addStringOption(option =>
        option
            .setName('command')
            .setDescription('Get detailed information about a specific command')
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
            embeds: [infoEmbed('Command Not Found', `The command \`${commandName}\` does not exist.`)],
            ephemeral: true,
        });
        return;
    }

    const embed = infoEmbed(`Command: /${command.data.name}`)
        .setDescription(command.data.description)
        .addFields({
            name: 'Usage',
            value: `\`/${command.data.name}\``,
            inline: false,
        });

    // Add options if any
    if (command.data.options && command.data.options.length > 0) {
        const options = command.data.options
            .map((opt: any) => `• \`${opt.name}\`: ${opt.description}`)
            .join('\n');
        embed.addFields({ name: 'Options', value: options, inline: false });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

/**
 * Shows all commands grouped by category
 */
async function showAllCommands(interaction: ChatInputCommandInteraction): Promise<void> {
    const commands = interaction.client.commands;

    if (!commands || commands.size === 0) {
        await interaction.reply({
            embeds: [infoEmbed('No Commands', 'No commands are currently available.')],
            ephemeral: true,
        });
        return;
    }

    // Group commands by category (based on folder structure)
    const categories = new Map<string, Array<{ name: string; description: string }>>();

    commands.forEach((command) => {
        // Extract category from command data or default to 'Utility'
        const category = (command as any).category || 'Utility';

        if (!categories.has(category)) {
            categories.set(category, []);
        }

        categories.get(category)?.push({
            name: command.data.name,
            description: command.data.description,
        });
    });

    // Build embed
    const embed = infoEmbed('📚 Help - Command List')
        .setDescription(
            'Here are all available commands. Use `/help <command>` for detailed information about a specific command.'
        );

    // Add fields for each category
    categories.forEach((commands, category) => {
        const commandList = commands
            .map(cmd => `• \`/${cmd.name}\` - ${cmd.description}`)
            .join('\n');

        embed.addFields({
            name: `${getCategoryEmoji(category)} ${category}`,
            value: commandList || 'No commands',
            inline: false,
        });
    });

    embed.setFooter({ text: `Total Commands: ${commands.size}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
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
