import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
} from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Tocar uma música do YouTube')
    .addStringOption((option) =>
        option
            .setName('query')
            .setDescription('URL ou nome da música do YouTube')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Verificar se o usuário está em um canal de voz
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const embed = errorEmbed(
                'Erro',
                'Você precisa estar em um canal de voz para usar este comando!'
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const query = interaction.options.getString('query', true);

        // Responder imediatamente para evitar timeout
        await interaction.reply({ content: '🔍 Procurando a música...', ephemeral: false });

        try {
            const distube = getDistube();

            logger.info(`[Play] Starting play for query: ${query}`);
            logger.info(`[Play] Voice channel: ${voiceChannel.id}, Text channel: ${interaction.channel?.id}`);

            // Iniciar o play (DisTube vai enviar a mensagem através dos eventos)
            await distube.play(voiceChannel, query, {
                member: member,
                textChannel: interaction.channel!,
            });

            logger.info(`[Play] Play command completed successfully`);

            // Deletar a mensagem "Procurando..." depois que o DisTube enviar a mensagem dele
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 2000);
        } catch (error: any) {
            logger.error('Error in play command:', error);
            logger.error('Error details - message:', error?.message);
            logger.error('Error details - stack:', error?.stack);

            // Verificar se é erro de parsing ou outros
            let errorMessage = 'Ocorreu um erro ao executar o comando.';
            if (error.message?.includes('Deprecated') || error.message?.includes('JSON')) {
                errorMessage = 'Erro ao processar a música. O YouTube pode estar bloqueando o acesso. Tente novamente em alguns instantes.';
            } else if (error.message?.includes('NO_RESULT')) {
                errorMessage = 'Não foi possível encontrar a música. Tente usar uma URL direta do YouTube.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            const embed = errorEmbed('Erro', errorMessage);
            await interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        logger.error('Error in play command:', error);
        const embed = errorEmbed(
            'Erro',
            'Ocorreu um erro ao executar o comando. Tente novamente.'
        );

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
}
