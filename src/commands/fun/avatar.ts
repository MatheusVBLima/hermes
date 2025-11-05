import {
    SlashCommandBuilder,
    EmbedBuilder,
    ChatInputCommandInteraction,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
} from 'discord.js';
import { EmbedColors } from '../../utils/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Ver o avatar de um usuário em alta resolução')
    .addUserOption((option) =>
        option
            .setName('usuário')
            .setDescription('Usuário para ver o avatar (deixe vazio para ver o seu)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const targetUser = interaction.options.getUser('usuário') || interaction.user;

    // Obter URLs de avatar em diferentes tamanhos
    const avatar512 = targetUser.displayAvatarURL({ size: 512, extension: 'png' });
    const avatar1024 = targetUser.displayAvatarURL({ size: 1024, extension: 'png' });
    const avatar2048 = targetUser.displayAvatarURL({ size: 2048, extension: 'png' });
    const avatar4096 = targetUser.displayAvatarURL({ size: 4096, extension: 'png' });

    // Obter avatar do servidor (se estiver em um servidor)
    let guildAvatar = null;
    if (interaction.guild) {
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (member && member.avatar) {
            guildAvatar = member.displayAvatarURL({ size: 1024, extension: 'png' });
        }
    }

    const embed = new EmbedBuilder()
        .setColor(EmbedColors.INFO)
        .setTitle(`🖼️ Avatar de ${targetUser.username}`)
        .setDescription(
            guildAvatar
                ? 'Avatar personalizado para este servidor detectado!'
                : 'Avatar global do usuário'
        )
        .setImage(guildAvatar || avatar1024)
        .addFields({
            name: '📥 Downloads',
            value: [
                `[512px](${avatar512})`,
                `[1024px](${avatar1024})`,
                `[2048px](${avatar2048})`,
                `[4096px](${avatar4096})`,
            ].join(' • '),
            inline: false,
        })
        .setTimestamp();

    // Botões para trocar entre avatar global e do servidor
    const buttons: ButtonBuilder[] = [];

    if (guildAvatar) {
        buttons.push(
            new ButtonBuilder()
                .setLabel('Avatar Global')
                .setURL(avatar1024)
                .setStyle(ButtonStyle.Link)
        );

        buttons.push(
            new ButtonBuilder()
                .setLabel('Avatar do Servidor')
                .setURL(guildAvatar)
                .setStyle(ButtonStyle.Link)
        );
    }

    const row = buttons.length > 0
        ? new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)
        : undefined;

    await interaction.reply({
        embeds: [embed],
        components: row ? [row] : [],
    });
}
