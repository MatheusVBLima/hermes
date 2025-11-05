import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../utils/logger.js';
import { errorEmbed } from '../utils/embeds.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        await handleChatInputCommand(interaction);
    }

    // Handle autocomplete (for future features)
    if (interaction.isAutocomplete()) {
        // Will be implemented when needed
    }

    // Handle buttons (for future features)
    if (interaction.isButton()) {
        // Will be implemented when needed
    }

    // Handle select menus (for future features)
    if (interaction.isStringSelectMenu()) {
        // Will be implemented when needed
    }
}

/**
 * Handles chat input (slash) commands
 */
async function handleChatInputCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = interaction.client.commands?.get(interaction.commandName);

    if (!command) {
        logger.warn(`Command not found: ${interaction.commandName}`);
        await interaction.reply({
            embeds: [errorEmbed('Command Not Found', 'This command does not exist or has been removed.')],
            ephemeral: true,
        });
        return;
    }

    try {
        // Log command execution
        const user = `${interaction.user.tag} (${interaction.user.id})`;
        const guild = interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : undefined;
        logger.command(user, interaction.commandName, guild);

        // Execute command
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}:`, error);

        // Send error message to user
        const errorMessage = {
            embeds: [
                errorEmbed(
                    'Command Error',
                    'There was an error executing this command. Please try again later.'
                ),
            ],
            ephemeral: true,
        };

        // Reply or follow up depending on interaction state
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}
