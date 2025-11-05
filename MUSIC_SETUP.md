# 🎵 Music Bot Setup Guide

## Pré-requisitos Adicionais

Para usar os comandos de música, você precisa ter **FFmpeg** instalado no seu sistema.

### Windows

1. Baixe FFmpeg: https://www.gyan.dev/ffmpeg/builds/
2. Extraia o arquivo ZIP
3. Adicione a pasta `bin` ao PATH do Windows
4. Teste rodando `ffmpeg -version` no terminal

### macOS

```bash
# Usando Homebrew
brew install ffmpeg
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install ffmpeg
```

### Verificar Instalação

```bash
ffmpeg -version
```

Se o comando acima funcionar, FFmpeg está instalado corretamente!

## Comandos de Música

### `/play <query>`
Tocar uma música do YouTube

**Exemplos:**
```
/play Never Gonna Give You Up
/play https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Features:**
- Pesquisa automática no YouTube
- Suporte para URLs diretas
- Adiciona à fila se algo já estiver tocando
- Mostra thumbnail, duração e quem pediu

### `/pause`
Pausar a música atual

### `/resume`
Retomar a música pausada

### `/skip`
Pular a música atual e tocar a próxima da fila

### `/stop`
Parar completamente a música, limpar a fila e desconectar do canal de voz

### `/queue [página]`
Ver a fila de músicas

**Exemplos:**
```
/queue
/queue página:2
```

**Features:**
- Mostra a música tocando agora
- Lista as próximas 10 músicas
- Paginação para filas grandes
- Mostra quem pediu cada música

### `/nowplaying`
Ver informações da música que está tocando agora

**Features:**
- Thumbnail da música
- Duração total
- Quem pediu
- Quantidade de músicas na fila
- Status (tocando/pausado)

## Troubleshooting

### Erro: "FFmpeg not found"
- Verifique se FFmpeg está instalado: `ffmpeg -version`
- Verifique se está no PATH do sistema
- Reinicie o terminal/IDE após instalar

### Erro ao tocar música
- Verifique sua conexão com a internet
- Alguns vídeos do YouTube podem estar bloqueados
- Tente com outro vídeo

### Bot não conecta ao canal de voz
- Verifique se você está em um canal de voz
- Verifique as permissões do bot no servidor
- O bot precisa da permissão "Connect" e "Speak"

### Qualidade de áudio ruim
- Isso depende da sua conexão e do servidor
- O bot usa a melhor qualidade disponível do YouTube

## Limitações

- ✅ Funciona com YouTube
- ❌ Spotify não é suportado diretamente (apenas URLs do YouTube)
- ❌ SoundCloud não é suportado nesta versão
- ⚠️ Playlists do YouTube não são suportadas (apenas vídeos individuais)

## Notas de Performance

- O bot usa streaming direto do YouTube
- Não há download de arquivos (economia de disco)
- Uso moderado de CPU e RAM
- Recomendado: Mínimo 512MB RAM para uso básico
- Recomendado: 1GB+ RAM para múltiplos servidores

## Deploy em Produção

Ao fazer deploy em produção (DigitalOcean, etc), certifique-se de:

1. Instalar FFmpeg no servidor:
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```

2. As dependências já estão no package.json:
   - `@discordjs/voice`
   - `play-dl`
   - `sodium-native`
   - `ffmpeg-static` (fallback se FFmpeg não estiver no sistema)

3. O bot vai usar FFmpeg do sistema se disponível, senão usa `ffmpeg-static`

## Permissões Necessárias do Bot

No Discord Developer Portal, certifique-se que o bot tem:

- ✅ Connect (conectar a canais de voz)
- ✅ Speak (falar em canais de voz)
- ✅ Use Voice Activity (detecção de voz)

## Exemplo de Uso

```
Usuário: /play Rick Astley Never Gonna Give You Up
Bot: 🎵 Tocando Agora
     Never Gonna Give You Up
     ⏱️ Duração: 3:33
     👤 Pedido por: SeuNome

Usuário: /play Darude Sandstorm
Bot: ➕ Adicionado à Fila
     Darude - Sandstorm
     📊 Posição na Fila: #2

Usuário: /queue
Bot: [Mostra fila completa]

Usuário: /skip
Bot: ⏭️ Música Pulada
     Never Gonna Give You Up

Usuário: /stop
Bot: ⏹️ Música parada e fila limpa. Desconectado do canal de voz.
```
