import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    EmbedBuilder,
} from 'discord.js';
import playdl from 'play-dl';
import { MusicManager } from '../../services/music/MusicManager.js';
import { Song } from '../../services/music/MusicPlayer.js';
import { errorEmbed, EmbedColors } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Tocar uma música do YouTube')
    .addStringOption((option) =>
        option
            .setName('query')
            .setDescription('Nome da música ou URL do YouTube')
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

        await interaction.deferReply();

        // Buscar música no YouTube
        let videoInfo;
        try {
            if (playdl.yt_validate(query) === 'video') {
                // É uma URL direta
                videoInfo = await playdl.video_info(query);
            } else {
                // Pesquisar no YouTube
                const search = await playdl.search(query, {
                    limit: 1,
                    source: { youtube: 'video' },
                });

                if (search.length === 0) {
                    const embed = errorEmbed(
                        'Não encontrado',
                        `Não foi possível encontrar: **${query}**`
                    );
                    return await interaction.editReply({ embeds: [embed] });
                }

                videoInfo = await playdl.video_info(search[0].url);
            }
        } catch (error) {
            logger.error('Error searching for music:', error);
            const embed = errorEmbed(
                'Erro na busca',
                'Ocorreu um erro ao buscar a música. Tente novamente.'
            );
            return await interaction.editReply({ embeds: [embed] });
        }

        const video = videoInfo.video_details;

        // Criar objeto de música
        const song: Song = {
            title: video.title!,
            url: video.url,
            duration: video.durationInSec,
            thumbnail: video.thumbnails[0].url,
            requestedBy: {
                id: interaction.user.id,
                username: interaction.user.username,
            },
        };

        // Obter ou criar player
        const player = MusicManager.getPlayer(interaction.guildId!);

        // Conectar ao canal de voz se ainda não estiver conectado
        if (!player.isConnected()) {
            try {
                await player.join(voiceChannel);
            } catch (error) {
                logger.error('Error joining voice channel:', error);
                const embed = errorEmbed(
                    'Erro de conexão',
                    'Não foi possível conectar ao canal de voz.'
                );
                return await interaction.editReply({ embeds: [embed] });
            }
        }

        // Adicionar música à fila
        player.addSong(song);

        // Formatar duração
        const duration = formatDuration(song.duration);

        // Se não estiver tocando, começar a tocar
        if (!player.isPlaying) {
            await player.play();

            const embed = new EmbedBuilder()
                .setColor(EmbedColors.SUCCESS)
                .setTitle('🎵 Tocando Agora')
                .setDescription(`[${song.title}](${song.url})`)
                .setThumbnail(song.thumbnail)
                .addFields(
                    {
                        name: '⏱️ Duração',
                        value: duration,
                        inline: true,
                    },
                    {
                        name: '👤 Pedido por',
                        value: song.requestedBy.username,
                        inline: true,
                    }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(EmbedColors.INFO)
                .setTitle('➕ Adicionado à Fila')
                .setDescription(`[${song.title}](${song.url})`)
                .setThumbnail(song.thumbnail)
                .addFields(
                    {
                        name: '⏱️ Duração',
                        value: duration,
                        inline: true,
                    },
                    {
                        name: '📊 Posição na Fila',
                        value: `#${player.queue.length + 1}`,
                        inline: true,
                    },
                    {
                        name: '👤 Pedido por',
                        value: song.requestedBy.username,
                        inline: true,
                    }
                )
                .setTimestamp();

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

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
