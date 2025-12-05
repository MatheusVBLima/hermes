import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
} from 'discord.js';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('fix')
    .setDescription('Tentar corrigir problemas de conexão de voz do bot');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const member = interaction.member as GuildMember;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            const embed = errorEmbed(
                'Erro',
                'Você precisa estar em um canal de voz para usar este comando!'
            );
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        await interaction.deferReply();

        const distube = getDistube();
        const queue = distube.getQueue(interaction.guildId!);

        // Verificar estado do bot
        const botMember = interaction.guild?.members.cache.get(interaction.client.user.id);
        const voiceState = botMember?.voice;

        if (voiceState) {
            logger.info(`[Fix] Bot voice state before fix:`, {
                mute: voiceState.mute,
                deaf: voiceState.deaf,
                selfMute: voiceState.selfMute,
                selfDeaf: voiceState.selfDeaf,
                channel: voiceState.channel?.name
            });
        }

        // Se há uma queue, parar e limpar
        if (queue) {
            try {
                await queue.stop();
                logger.info(`[Fix] Stopped existing queue`);
            } catch (error) {
                logger.error(`[Fix] Error stopping queue:`, error);
            }
        }

        // Aguardar um pouco antes de reconectar
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Tentar reconectar diretamente ao canal
        try {
            await distube.play(voiceChannel, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
                member: member,
                textChannel: interaction.channel!,
                skip: true, // Não reproduzir, apenas conectar
            });

            // Aguardar um pouco e verificar estado
            await new Promise(resolve => setTimeout(resolve, 1000));

            const newQueue = distube.getQueue(interaction.guildId!);
            const newBotMember = interaction.guild?.members.cache.get(interaction.client.user.id);
            const newVoiceState = newBotMember?.voice;

            if (newVoiceState) {
                logger.info(`[Fix] Bot voice state after fix:`, {
                    mute: newVoiceState.mute,
                    deaf: newVoiceState.deaf,
                    selfMute: newVoiceState.selfMute,
                    selfDeaf: newVoiceState.selfDeaf,
                    channel: newVoiceState.channel?.name
                });

                if (newVoiceState.deaf || newVoiceState.selfDeaf) {
                    const embed = errorEmbed(
                        '⚠️ Bot Ainda Ensurdecido',
                        `O bot ainda está ensurdecido após a tentativa de correção.\n\n` +
                        `**Estado atual:**\n` +
                        `- Server deaf: ${newVoiceState.deaf}\n` +
                        `- Self deaf: ${newVoiceState.selfDeaf}\n\n` +
                        `**Possíveis causas:**\n` +
                        `1. Configurações do canal de voz bloqueando o bot\n` +
                        `2. Outro bot ou sistema ensurdecendo automaticamente\n` +
                        `3. Bug conhecido do Discord\n\n` +
                        `**Soluções:**\n` +
                        `- Verifique as permissões do canal de voz\n` +
                        `- Tente reinvitar o bot com um novo link de convite\n` +
                        `- Verifique se há outros bots interferindo`
                    );
                    return await interaction.editReply({ embeds: [embed] });
                } else {
                    const embed = successEmbed(
                        '✅ Bot Corrigido',
                        'O bot foi reconectado e não está mais ensurdecido. Use `/play` para tocar música.'
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }
            }
        } catch (error: any) {
            logger.error(`[Fix] Error reconnecting:`, error);
            const embed = errorEmbed(
                'Erro',
                `Erro ao tentar reconectar: ${error.message || 'Erro desconhecido'}`
            );
            return await interaction.editReply({ embeds: [embed] });
        }

        const embed = successEmbed(
            '✅ Comando Executado',
            'Tentativa de correção concluída. Verifique os logs para mais detalhes.'
        );
        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        logger.error('Error in fix command:', error);
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

