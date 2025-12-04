import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
} from 'discord.js';
import play from 'play-dl';
import { getDistube } from '../../services/music/DisTubeService.js';
import { errorEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const sanitizeYoutubeUrl = (value: string): string => {
    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, '');

        if (host === 'youtu.be' && url.pathname.length > 1) {
            return `https://www.youtube.com/watch?v=${url.pathname.slice(1)}`;
        }

        if (host === 'youtube.com' || host === 'youtu.be') {
            const videoId = url.searchParams.get('v');
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }
    } catch {
        // Se não for URL válida, retorna original
    }
    return value;
};

const resolveYoutubeUrl = async (query: string): Promise<string | null> => {
    try {
        const results = await play.search(query, {
            limit: 1,
            source: { youtube: 'video' },
        });

        const first = results[0];
        if (first && 'url' in first && typeof first.url === 'string') {
            return first.url;
        }
    } catch (error) {
        logger.warn('[Play] Falha ao buscar vídeo via play-dl', error);
    }
    return null;
};

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
        const textChannel = interaction.channel!;
        const distube = getDistube();
        const cleanupReply = () =>
            setTimeout(() => {
                interaction.deleteReply().catch(() => {});
            }, 2000);

        // Se não for URL, tentar resolver para uma URL antes de tocar
        let target = query;
        if (!isUrl(query)) {
            const resolved = await resolveYoutubeUrl(query);
            if (!resolved) {
                const embed = errorEmbed(
                    'Erro',
                    'Não consegui encontrar essa música. Tente usar um nome diferente ou uma URL direta do YouTube.'
                );
                await interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
                return;
            }
            target = resolved;
        }
        target = sanitizeYoutubeUrl(target);

        // Responder imediatamente para evitar timeout
        await interaction.reply({ content: '🔍 Procurando a música...', ephemeral: false });

        try {
            logger.info(`[Play] Starting play for query: ${query}`);
            logger.info(`[Play] Normalized target: ${target}`);
            logger.info(`[Play] Voice channel: ${voiceChannel.id}, Text channel: ${interaction.channel?.id}`);

            // Iniciar o play (DisTube vai enviar a mensagem através dos eventos)
            const playPromise = distube.play(voiceChannel, target, {
                member: member,
                textChannel,
            });

            // Timeout de segurança para evitar ficar preso, mas sem quebrar se a fila estiver andando
            const timeoutMs = 30000;
            const result = await Promise.race([
                playPromise.then(() => 'played'),
                new Promise<'timeout'>((resolve) =>
                    setTimeout(() => resolve('timeout'), timeoutMs)
                ),
            ]);

            if (result === 'timeout') {
                const queue = distube.getQueue(voiceChannel.guild.id);
                const hasSongs = queue?.songs?.length ?? 0;
                const isPlaying = queue?.playing ?? false;

                if (hasSongs > 0 || isPlaying) {
                    logger.warn(
                        `[Play] Play took longer than ${timeoutMs}ms, but queue has ${hasSongs} songs (playing=${isPlaying}). Waiting without failing.`
                    );
                } else {
                    throw new Error('PLAY_TIMEOUT');
                }
            }

            logger.info(`[Play] Play command completed successfully`);

            // Deletar a mensagem "Procurando..." depois que o DisTube enviar a mensagem dele
            cleanupReply();
        } catch (error: any) {
            logger.error('Error in play command:', error);
            logger.error('Error details - message:', error?.message);
            logger.error('Error details - stack:', error?.stack);

            // Verificar se é erro de parsing ou outros
            let errorMessage = 'Ocorreu um erro ao executar o comando.';
            if (error.message?.includes('Deprecated') || error.message?.includes('JSON')) {
                errorMessage = 'Erro ao processar a música. O YouTube pode estar bloqueando o acesso. Tente novamente em alguns instantes.';
            } else if (error.message?.includes('NO_RESULT')) {
                errorMessage = 'Não foi possível encontrar a música. Tente usar uma URL direta do YouTube ou outra consulta.';
            } else if (error.message === 'PLAY_TIMEOUT') {
                errorMessage = 'A busca demorou demais para iniciar. Tente novamente; se persistir, use uma URL direta do YouTube.';
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
