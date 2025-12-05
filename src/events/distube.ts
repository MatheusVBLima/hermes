import { Events, Client } from 'discord.js';
import { initializeDistube, getDistube } from '../services/music/DisTubeService.js';
import { EmbedBuilder } from 'discord.js';
import { EmbedColors } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import util from 'node:util';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>) {
    // Initialize DisTube first
    try {
        initializeDistube(client);
        logger.success('DisTube initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize DisTube:', error);
        return; // Don't register events if DisTube failed to initialize
    }
    
    const distube = getDistube();

    // When a song starts playing
    distube.on('playSong' as any, (queue, song) => {
        logger.info(`[DisTube] ✅ playSong event fired for: ${song.name}`);
        logger.info(`[DisTube] Queue state - playing: ${queue.playing}, paused: ${queue.paused}, songs: ${queue.songs.length}`);
        logger.info(`[DisTube] Voice state - connected: ${queue.voice?.connection ? 'yes' : 'no'}, stream: ${queue.voice?.stream ? 'exists' : 'undefined'}`);
        
        const embed = new EmbedBuilder()
            .setColor(EmbedColors.SUCCESS)
            .setTitle('🎵 Tocando Agora')
            .setDescription(`[${song.name}](${song.url})`)
            .setThumbnail(song.thumbnail || '')
            .addFields(
                {
                    name: '⏱️ Duração',
                    value: song.formattedDuration,
                    inline: true,
                },
                {
                    name: '👤 Pedido por',
                    value: song.user?.username || 'Desconhecido',
                    inline: true,
                }
            )
            .setTimestamp();

        queue.textChannel?.send({ embeds: [embed] }).catch((err) => {
            logger.error('Failed to send playSong message:', err);
        });
    });

    // When a song is added to queue
    distube.on('addSong' as any, (queue, song) => {
        logger.info(`[DisTube] addSong event fired for: ${song.name}, queue length: ${queue.songs.length}`);
        
        // Verificar se o bot está desmutado e se precisa iniciar a reprodução
        const member = queue.voiceChannel?.guild.members.cache.get(client.user.id);
        if (member?.voice) {
            const voiceState = member.voice;
            const isMuted = voiceState.mute || voiceState.deaf || voiceState.selfMute || voiceState.selfDeaf;
            
            if (isMuted) {
                logger.warn(`[DisTube] addSong - Bot is still muted/deafened. Attempting to fix...`);
                
                // Tentar desmutar se necessário
                if (voiceState.selfDeaf) {
                    queue.voice.setSelfDeaf(false);
                }
                if (voiceState.selfMute) {
                    queue.voice.setSelfMute(false);
                }
            }
            
            // Se é a primeira música na fila e não está tocando, tentar iniciar
            if (queue.songs.length === 1 && !queue.playing && queue.voice?.connection) {
                logger.info(`[DisTube] addSong - First song in queue, attempting to start playback...`);
                
                // Aguardar um pouco para garantir que o bot está desmutado
                setTimeout(async () => {
                    try {
                        const currentQueue = distube.getQueue(queue.voiceChannel?.guild.id!);
                        if (currentQueue && currentQueue.songs.length > 0 && !currentQueue.playing) {
                            const connectionState = currentQueue.voice?.connection?.state?.status;
                            if (connectionState === 'ready') {
                                logger.info(`[DisTube] addSong - Starting playback...`);
                                try {
                                    await currentQueue.play();
                                    logger.info(`[DisTube] ✅ Playback started successfully`);
                                } catch (playError) {
                                    logger.error(`[DisTube] Error starting playback:`, playError);
                                }
                            } else {
                                logger.warn(`[DisTube] addSong - Connection not ready (${connectionState}), cannot start playback`);
                            }
                        }
                    } catch (error) {
                        logger.error(`[DisTube] Error in addSong playback check:`, error);
                    }
                }, 2000); // Aguardar 2 segundos para garantir que está desmutado
            }
        }
        
        const embed = new EmbedBuilder()
            .setColor(EmbedColors.INFO)
            .setTitle('➕ Adicionado à Fila')
            .setDescription(`[${song.name}](${song.url})`)
            .setThumbnail(song.thumbnail || '')
            .addFields(
                {
                    name: '⏱️ Duração',
                    value: song.formattedDuration,
                    inline: true,
                },
                {
                    name: '📊 Posição na Fila',
                    value: `#${queue.songs.length}`,
                    inline: true,
                },
                {
                    name: '👤 Pedido por',
                    value: song.user?.username || 'Desconhecido',
                    inline: true,
                }
            )
            .setTimestamp();

        queue.textChannel?.send({ embeds: [embed] }).catch((err) => {
            logger.error('Failed to send addSong message:', err);
        });
    });

    // Error handling
    distube.on('error' as any, (channelOrQueue, error) => {
        // O evento error pode receber diferentes assinaturas:
        // - error(channel, error) quando há um channel
        // - error(queue, error) quando há uma queue  
        // - error(queue, queue) quando o segundo parâmetro também é queue (bug do DisTube?)
        
        // Dump bruto dos parâmetros recebidos para diagnosticar erros silenciosos
        try {
            logger.error('[DisTube] Raw error dump - channelOrQueue:', util.inspect(channelOrQueue, { depth: 2, getters: true }));
            logger.error('[DisTube] Raw error dump - error:', util.inspect(error, { depth: 2, getters: true }));
        } catch (inspectError) {
            logger.error('[DisTube] Failed to inspect DisTube error payload:', inspectError);
        }

        // Determinar qual é o textChannel e qual é o erro real
        let textChannel: any = null;
        let actualError: any = null;
        let queue: any = null;
        
        // Se o primeiro parâmetro tem textChannel, é uma Queue
        if (channelOrQueue?.textChannel) {
            queue = channelOrQueue;
            textChannel = queue.textChannel;
            
            // Verificar se o segundo parâmetro é realmente um erro ou também é uma Queue
            if (error && error !== channelOrQueue) {
                // Se o segundo parâmetro tem textChannel, também é uma Queue (bug do DisTube)
                if (error.textChannel) {
                    // Ambos são Queues - pegar o erro da voice connection
                    actualError = queue.voice?.emittedError || 
                                 error.voice?.emittedError ||
                                 new Error('Erro desconhecido - verifique voice.emittedError');
                } else if (error instanceof Error || (typeof error === 'object' && error.message)) {
                    // É um erro real
                    actualError = error;
                } else {
                    // Tentar pegar o erro da queue
                    actualError = queue.voice?.emittedError || 
                                 queue.emittedError ||
                                 new Error('Erro desconhecido durante reprodução');
                }
            } else {
                // Segundo parâmetro é undefined ou igual ao primeiro
                // Tentar pegar o erro da voice connection ou queue
                actualError = queue.voice?.emittedError || 
                             queue.emittedError ||
                             new Error('Erro desconhecido - queue sem erro definido');
            }
        } 
        // Se tem método send, é um Channel
        else if (typeof channelOrQueue?.send === 'function') {
            textChannel = channelOrQueue;
            actualError = error || new Error('Erro desconhecido durante reprodução');
        }
        
        // Log detalhado do erro
        logger.error('DisTube error - Queue state:', {
            songs: queue?.songs?.length || 0,
            playing: queue?.playing,
            paused: queue?.paused,
            stopped: queue?.stopped,
            stream: queue?.voice?.stream ? 'exists' : 'undefined',
            voiceConnected: queue?.voice?.connection ? 'yes' : 'no',
            voiceStatus: queue?.voice?.connection?.state?.status || 'unknown',
            emittedError: queue?.voice?.emittedError?.message || 'none'
        });
        
        // Log completo do erro para diagnóstico
        try {
            logger.error('DisTube error - Full error object:', actualError);
            logger.error('DisTube error - Error message:', actualError?.message || 'NO MESSAGE');
            logger.error('DisTube error - Error name:', actualError?.name || 'NO NAME');
            logger.error('DisTube error - Error code:', actualError?.code || 'NO CODE');
            logger.error('DisTube error - Error toString:', actualError?.toString() || 'NO toString');
            if (actualError?.stack) {
                logger.error('DisTube error - Stack trace:', actualError.stack);
            }
            // Tentar serializar apenas propriedades específicas
            if (actualError && typeof actualError === 'object') {
                const errorInfo: any = {};
                if (actualError.message) errorInfo.message = actualError.message;
                if (actualError.name) errorInfo.name = actualError.name;
                if (actualError.code) errorInfo.code = actualError.code;
                if (actualError.errorCode) errorInfo.errorCode = actualError.errorCode;
                logger.error('DisTube error - Serialized info:', JSON.stringify(errorInfo, null, 2));
            }
        } catch (logError) {
            logger.error('Failed to log error details:', logError);
        }
        if (queue) {
            logger.info(`[DisTube] Error in queue for guild ${queue.voiceChannel?.guild.id}`);
            logger.info(`[DisTube] Queue state - playing: ${queue.playing}, paused: ${queue.paused}, stopped: ${queue.stopped}`);
            logger.info(`[DisTube] Queue state - songs: ${queue.songs.length}, previousSongs: ${queue.previousSongs.length}`);
            if (queue.songs.length > 0) {
                logger.info(`[DisTube] Current song: ${queue.songs[0].name}`);
                logger.info(`[DisTube] Current song URL: ${queue.songs[0].url}`);
                logger.info(`[DisTube] Current song source: ${queue.songs[0].source}`);
            } else if (queue.previousSongs.length > 0) {
                logger.info(`[DisTube] Last song (removed): ${queue.previousSongs[queue.previousSongs.length - 1]?.name}`);
            }
            logger.info(`[DisTube] Queue state - voice connected: ${queue.voice?.connection ? 'yes' : 'no'}`);
            logger.info(`[DisTube] Queue state - voice status: ${queue.voice?.connection?.state?.status || 'unknown'}`);
            logger.info(`[DisTube] Queue state - stream: ${queue.voice?.stream ? 'exists' : 'undefined'}`);
            logger.info(`[DisTube] Queue state - voice emittedError: ${queue.voice?.emittedError?.message || 'none'}`);
            
            // Verificar eventos de erro na voice connection
            if (queue.voice?.connection) {
                const connection = queue.voice.connection;
                logger.info(`[DisTube] Voice connection state:`, {
                    status: connection.state?.status,
                    reason: connection.state?.reason,
                    closeCode: connection.state?.closeCode
                });
            }
            
            // Tentar recuperar automaticamente se a conexão foi perdida mas há músicas na fila ou havia antes
            const hasSongsInQueue = queue.songs.length > 0;
            const hadSongsBefore = queue.previousSongs.length > 0;
            const shouldAttemptReconnect = hasSongsInQueue || (hadSongsBefore && !queue.voice?.connection);
            
            if (queue && shouldAttemptReconnect && queue.voiceChannel) {
                logger.warn(`[DisTube] ⚠️ Connection lost. Queue: ${queue.songs.length} songs, Previous: ${queue.previousSongs.length} songs. Attempting to reconnect...`);
                
                // Aguardar um pouco antes de tentar reconectar
                setTimeout(async () => {
                    try {
                        const currentQueue = distube.getQueue(queue.voiceChannel?.guild.id!);
                        
                        // Verificar se há músicas na fila atual ou tentar usar a última música que estava tocando
                        let songToPlay = null;
                        if (currentQueue && currentQueue.songs.length > 0) {
                            songToPlay = currentQueue.songs[0];
                        } else if (currentQueue && currentQueue.previousSongs.length > 0) {
                            // Tentar tocar a última música que estava na fila
                            songToPlay = currentQueue.previousSongs[currentQueue.previousSongs.length - 1];
                        }
                        
                        if (songToPlay && (!currentQueue?.voice?.connection || currentQueue.songs.length > 0)) {
                            logger.info(`[DisTube] Attempting to reconnect and resume playback with: ${songToPlay.name}...`);
                            
                            // Tentar conectar novamente usando play (isso reconecta automaticamente)
                            try {
                                // Pegar um membro do canal de voz para usar como member
                                let member: any = null;
                                if (songToPlay.user?.id) {
                                    try {
                                        member = await queue.voiceChannel?.guild.members.fetch(songToPlay.user.id);
                                    } catch {
                                        // Se não conseguir pegar o membro, usar qualquer membro do canal
                                        member = queue.voiceChannel?.members.first() || null;
                                    }
                                } else {
                                    member = queue.voiceChannel?.members.first() || null;
                                }
                                
                                if (!member) {
                                    logger.warn(`[DisTube] No member found in voice channel for reconnect`);
                                    return;
                                }
                                
                                // Se há uma queue atual, parar primeiro
                                if (currentQueue) {
                                    try {
                                        await currentQueue.stop();
                                    } catch {
                                        // Ignorar erros ao parar
                                    }
                                }
                                
                                // Aguardar um pouco
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                // Tentar tocar novamente
                                await distube.play(queue.voiceChannel!, songToPlay.url, {
                                    member: member,
                                    textChannel: queue.textChannel,
                                    skip: false,
                                });
                                 
                                logger.info(`[DisTube] ✅ Successfully reconnected and resumed playback`);
                            } catch (reconnectError) {
                                logger.error(`[DisTube] Failed to reconnect:`, reconnectError);
                            }
                        } else {
                            logger.info(`[DisTube] No song available to reconnect with`);
                        }
                    } catch (error) {
                        logger.error(`[DisTube] Error during reconnect attempt:`, error);
                    }
                }, 2000);
            }
        }
        
        // Verificar se é erro de parsing JSON (problema conhecido com yt-dlp)
        const isJsonError = actualError?.message?.includes('JSON') || 
                           actualError?.message?.includes('Deprecated') ||
                           actualError?.stack?.includes('JSON.parse');
        
        if (textChannel && typeof textChannel.send === 'function') {
            let errorMessage = 'Ocorreu um erro ao reproduzir a música.';
            
            if (isJsonError) {
                errorMessage = 'Erro ao processar a música do YouTube. Isso pode ser causado por avisos de depreciação do yt-dlp. Por favor, tente novamente em alguns instantes ou use uma URL direta do YouTube.';
            } else if (actualError?.message && actualError.message !== 'Erro desconhecido durante reprodução' && actualError.message !== 'Erro desconhecido - queue sem erro definido' && actualError.message !== 'Erro desconhecido - verifique voice.emittedError') {
                errorMessage = actualError.message;
            }
            
            const embed = new EmbedBuilder()
                .setColor(EmbedColors.ERROR)
                .setTitle('❌ Erro')
                .setDescription(errorMessage)
                .setTimestamp();
            textChannel.send({ embeds: [embed] }).catch((err) => {
                logger.error('Failed to send error message:', err);
            });
        }
    });

    // Handle empty queue - bot leaves channel
    distube.on('empty' as any, (queue) => {
        logger.info(`Voice channel is empty in guild ${queue.voiceChannel?.guild.id}`);
    });

    // Handle disconnection
    distube.on('disconnect' as any, (queue) => {
        logger.info(`Disconnected from voice channel in guild ${queue.voiceChannel?.guild.id}`);
    });

    // Handle finish - when queue ends
    distube.on('finish' as any, (queue) => {
        logger.info(`Queue finished in guild ${queue.voiceChannel?.guild.id}`);
    });

    // Log all DisTube events for debugging
    // Note: initQueue listener is also registered below for voice events

    distube.on('addList' as any, (queue, playlist) => {
        logger.info(`[DisTube] Playlist added: ${playlist.name} with ${playlist.songs.length} songs`);
    });

    distube.on('noRelated' as any, (queue) => {
        logger.warn(`[DisTube] No related songs found for queue in guild ${queue.voiceChannel?.guild.id}`);
    });

    distube.on('searchResult' as any, (message, result) => {
        logger.info(`[DisTube] Search result received: ${result.length} results`);
    });

    distube.on('searchCancel' as any, (message) => {
        logger.info(`[DisTube] Search cancelled`);
    });

    distube.on('searchInvalidAnswer' as any, (message, answer) => {
        logger.warn(`[DisTube] Invalid search answer: ${answer}`);
    });

    distube.on('searchNoResult' as any, (message) => {
        logger.warn(`[DisTube] No search results found`);
    });

    // Listen to voice state updates to detect when bot is muted/deafened
    client.on('voiceStateUpdate', async (oldState, newState) => {
        // Only check for bot's own voice state
        if (newState.member?.id === client.user.id) {
            if (newState.mute && !oldState.mute) {
                logger.warn(`[Voice] Bot was MUTED in guild ${newState.guild.id} - Audio will not play!`);
            }
            if (newState.deaf && !oldState.deaf) {
                logger.warn(`[Voice] Bot was DEAFENED in guild ${newState.guild.id} - Audio will not play!`);
                
                // Verificar permissões do canal quando bot é ensurdecido
                if (newState.channel) {
                    const channel = newState.channel;
                    const botMember = newState.guild.members.cache.get(client.user.id);
                    if (botMember) {
                        const permissions = channel.permissionsFor(botMember);
                        logger.warn(`[Voice] ⚠️ CRITICAL: Bot was DEAFENED - Full diagnostic:`);
                        logger.warn(`[Voice] Channel: ${channel.name} (${channel.id})`);
                        logger.warn(`[Voice] Bot member roles:`, botMember.roles.cache.map(r => r.name).join(', '));
                        logger.warn(`[Voice] Bot highest role: ${botMember.roles.highest.name}`);
                        logger.warn(`[Voice] Channel permissions check:`);
                        logger.warn(`[Voice] - Connect: ${permissions?.has('Connect')}`);
                        logger.warn(`[Voice] - Speak: ${permissions?.has('Speak')}`);
                        logger.warn(`[Voice] - View Channel: ${permissions?.has('ViewChannel')}`);
                        logger.warn(`[Voice] - Administrator: ${permissions?.has('Administrator')}`);
                        
                        // Verificar se há permissões negativas específicas do canal
                        const channelOverwrites = channel.permissionOverwrites.cache.get(botMember.id);
                        if (channelOverwrites) {
                            logger.warn(`[Voice] ⚠️ Channel-specific overrides for bot FOUND:`);
                            logger.warn(`[Voice] - Connect denied: ${channelOverwrites.deny.has('Connect')}`);
                            logger.warn(`[Voice] - Speak denied: ${channelOverwrites.deny.has('Speak')}`);
                            logger.warn(`[Voice] - Connect allowed: ${channelOverwrites.allow.has('Connect')}`);
                            logger.warn(`[Voice] - Speak allowed: ${channelOverwrites.allow.has('Speak')}`);
                        } else {
                            logger.warn(`[Voice] No channel-specific overrides for bot`);
                        }
                        
                        // Verificar categoria
                        if (channel.parent) {
                            logger.warn(`[Voice] Channel is in category: ${channel.parent.name}`);
                            const categoryPerms = channel.parent.permissionsFor(botMember);
                            logger.warn(`[Voice] Category permissions - Connect: ${categoryPerms?.has('Connect')}, Speak: ${categoryPerms?.has('Speak')}`);
                        }
                    }
                }
            }
            if (!newState.mute && oldState.mute) {
                logger.info(`[Voice] Bot was UNMUTED in guild ${newState.guild.id}`);
            }
            if (!newState.deaf && oldState.deaf) {
                logger.info(`[Voice] Bot was UNDEAFENED in guild ${newState.guild.id}`);
            }
        }
    });

    // Listen to voice events for debugging
    distube.on('initQueue' as any, (queue) => {
        logger.info(`[DisTube] Queue initialized in guild ${queue.voiceChannel?.guild.id}`);
        logger.info(`[DisTube] initQueue - Guild: ${queue.voiceChannel?.guild.id}`);
        
        // Check bot voice state when queue is initialized
        const member = queue.voiceChannel?.guild.members.cache.get(client.user.id);
        if (member?.voice) {
            const voiceState = member.voice;
            logger.info(`[DisTube] Bot voice state - mute: ${voiceState.mute}, deaf: ${voiceState.deaf}, selfMute: ${voiceState.selfMute}, selfDeaf: ${voiceState.selfDeaf}`);
            logger.info(`[DisTube] Voice channel: ${queue.voiceChannel?.name} (${queue.voiceChannel?.id})`);
            logger.info(`[DisTube] Voice connection exists: ${queue.voice?.connection ? 'yes' : 'no'}`);
            if (queue.voice?.connection) {
                logger.info(`[DisTube] Voice connection status: ${queue.voice.connection.state?.status}`);
                logger.info(`[DisTube] Voice connection state details:`, {
                    status: queue.voice.connection.state?.status,
                    reason: queue.voice.connection.state?.reason,
                    closeCode: queue.voice.connection.state?.closeCode
                });
            }
            
            if (voiceState.mute || voiceState.deaf || voiceState.selfMute || voiceState.selfDeaf) {
                logger.error(`[DisTube] ⚠️ Bot is muted/deafened in guild ${queue.voiceChannel?.guild.id}!`);
                logger.error(`[DisTube] - Server mute: ${voiceState.mute}, Server deaf: ${voiceState.deaf}`);
                logger.error(`[DisTube] - Self mute: ${voiceState.selfMute}, Self deaf: ${voiceState.selfDeaf}`);
                logger.error(`[DisTube] This WILL prevent audio playback!`);
                
                // Tentar corrigir o estado usando os métodos do DisTubeVoice
                if (voiceState.selfDeaf) {
                    logger.warn(`[DisTube] Attempting to fix selfDeaf state using setSelfDeaf(false)...`);
                    try {
                        const result = queue.voice.setSelfDeaf(false);
                        logger.info(`[DisTube] setSelfDeaf(false) result: ${result}`);
                        if (result) {
                            logger.info(`[DisTube] ✅ Successfully un-deafened bot!`);
                            logger.info(`[DisTube] Waiting for song to be added to queue... (addSong event will handle playback)`);
                            // Não verificar a fila aqui - deixar o evento addSong lidar com isso
                            // Isso evita race conditions onde a música ainda não foi adicionada
                        } else {
                            logger.warn(`[DisTube] ⚠️ setSelfDeaf(false) returned false - may not have permission`);
                        }
                    } catch (error) {
                        logger.error(`[DisTube] Error calling setSelfDeaf:`, error);
                    }
                }
                
                if (voiceState.selfMute) {
                    logger.warn(`[DisTube] Attempting to fix selfMute state using setSelfMute(false)...`);
                    try {
                        const result = queue.voice.setSelfMute(false);
                        logger.info(`[DisTube] setSelfMute(false) result: ${result}`);
                    } catch (error) {
                        logger.error(`[DisTube] Error calling setSelfMute:`, error);
                    }
                }
                
                // Se ainda estiver ensurdecido pelo servidor, tentar desconectar e reconectar
                if (voiceState.deaf && !voiceState.selfDeaf) {
                    logger.warn(`[DisTube] Bot is server-deafened (not self-deafened). Attempting to disconnect and reconnect...`);
                    setTimeout(async () => {
                        try {
                            await queue.stop();
                            logger.info(`[DisTube] Disconnected to fix server-deafened state. Please use /play again.`);
                            
                            // Enviar mensagem no canal de texto
                            if (queue.textChannel) {
                                const embed = new EmbedBuilder()
                                    .setColor(EmbedColors.ERROR)
                                    .setTitle('⚠️ Bot Ensurdecido pelo Servidor')
                                    .setDescription('O bot está sendo ensurdecido pelo servidor. Isso geralmente é causado por:\n\n1. Permissões negativas no canal de voz\n2. Configurações da categoria\n3. Bug do Discord\n\n**Solução:** Verifique as permissões do canal e remova qualquer bloqueio (X vermelho) para o bot.')
                                    .setTimestamp();
                                queue.textChannel.send({ embeds: [embed] }).catch(() => {});
                            }
                        } catch (error) {
                            logger.error(`[DisTube] Error stopping queue:`, error);
                        }
                    }, 2000);
                }
            } else {
                logger.info(`[DisTube] ✅ Bot voice state is OK - ready to play audio`);
            }
        } else {
            logger.warn(`[DisTube] Could not find bot member in guild ${queue.voiceChannel?.guild.id}`);
        }
        
        queue.voice.on('error', (error) => {
            logger.error('[DisTube Voice] Voice error event fired:', error);
            logger.error('[DisTube Voice] Error details:', {
                message: error?.message,
                name: error?.name,
                code: error?.code,
                stack: error?.stack?.substring(0, 500)
            });
        });
        
        queue.voice.on('disconnect', (error) => {
            logger.warn('[DisTube Voice] Disconnected:', error?.message || 'No error message');
            if (error) {
                logger.warn('[DisTube Voice] Disconnect error details:', {
                    message: error.message,
                    name: error.name,
                    code: error.code
                });
            }
        });
        
        queue.voice.on('finish', () => {
            logger.info('[DisTube Voice] Finished playing');
        });
        
        // Listen to connection errors
        if (queue.voice.connection) {
            queue.voice.connection.on('stateChange', (oldState, newState) => {
                logger.info(`[DisTube Voice] Connection state changed: ${oldState.status} -> ${newState.status}`);
                if (newState.status === 'disconnected') {
                    logger.warn(`[DisTube Voice] Disconnected - reason: ${newState.reason}, closeCode: ${newState.closeCode}`);
                }
            });
            
            queue.voice.connection.on('error', (error) => {
                logger.error('[DisTube Voice] Connection error:', error);
            });
        }
    });

    logger.success('DisTube events registered');
}

