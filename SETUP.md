# Hermes Bot - Setup Guide

## Status Atual: Fase 5 Completa! ✅

O bot está com sistema completo de moderação, XP/níveis, engajamento comunitário, economia e entretenimento!

### ✅ Fase 1: MVP Foundation (Completo)

#### Arquitetura
- ✅ Sistema de carregamento automático de comandos
- ✅ Sistema de carregamento automático de eventos
- ✅ Estrutura modular organizada por categorias
- ✅ Sistema de logging com cores e timestamps
- ✅ Tratamento de erros global
- ✅ TypeScript com strict mode

#### Comandos Utilitários (6 comandos)
- ✅ `/ping` - Verificar latência do bot
- ✅ `/help` - Listar todos os comandos disponíveis
- ✅ `/userinfo` - Informações detalhadas sobre usuários
- ✅ `/serverinfo` - Estatísticas completas do servidor
- ✅ `/rank` - Ver nível e XP (Fase 3)
- ✅ `/leaderboard` - Top usuários do servidor (Fase 3)

#### Sistema de Utilitários
- ✅ Logger colorido e estruturado
- ✅ Embed builders reutilizáveis
- ✅ Validação de configuração
- ✅ Gerenciamento de ambiente

### ✅ Fase 2: Sistema de Moderação (Completo)

#### Database Integration
- ✅ Prisma ORM + SQLite
- ✅ Migrations automáticas
- ✅ 5 modelos de dados (Guild, Warning, ModLog, UserLevel, UserEconomy)
- ✅ Conexão automática e graceful shutdown

#### Comandos de Moderação (6 comandos)
- ✅ `/ban` - Banir usuários (com opção de deletar mensagens 0-7 dias)
- ✅ `/kick` - Expulsar usuários do servidor
- ✅ `/timeout` - Timeout temporário (1-40320 minutos)
- ✅ `/warn` - Sistema de avisos com contador
- ✅ `/warnings` - Ver histórico de avisos
- ✅ `/clear` - Deletar mensagens em massa (1-100)

#### Event Logging (2 eventos)
- ✅ `messageDelete` - Log de mensagens deletadas
- ✅ `messageUpdate` - Log de mensagens editadas

#### Recursos de Segurança
- ✅ Verificação de permissões
- ✅ Validação de hierarquia de roles
- ✅ DM notifications para usuários afetados
- ✅ Database logging de todas ações
- ✅ Proteção anti-self-moderation

### ✅ Fase 3: Sistema de Engajamento (Completo)

#### Sistema de XP e Níveis
- ✅ Ganho automático de XP ao enviar mensagens (15-25 XP)
- ✅ Cooldown de 60 segundos entre ganhos
- ✅ Fórmula de nível: floor(0.1 * sqrt(xp))
- ✅ Notificações automáticas de level-up
- ✅ Persistência no banco de dados

#### Comandos de Leveling (2 comandos)
- ✅ `/rank [user]` - Ver nível, XP, rank e progresso
- ✅ `/leaderboard [page]` - Top 10 usuários (paginado)

#### Sistema de Boas-vindas (3 eventos)
- ✅ `messageCreate` - Tracking de XP automático
- ✅ `guildMemberAdd` - Mensagens de boas-vindas
- ✅ `guildMemberRemove` - Mensagens de despedida

#### Recursos de Engajamento
- ✅ Barra de progresso visual para próximo nível
- ✅ Medalhas para top 3 (🥇🥈🥉)
- ✅ Placeholders personalizáveis: {user}, {username}, {server}, {memberCount}
- ✅ Canal de boas-vindas configurável
- ✅ Sistema de ranking por servidor

### ✅ Fase 4: Sistema de Economia (Completo)

#### Moeda Virtual
- ✅ Sistema de moedas por servidor
- ✅ Saldo persistente no banco de dados
- ✅ Transações entre usuários
- ✅ Sistema de ranking por moedas

#### Comandos de Economia (6 comandos)
- ✅ `/balance [user]` - Ver saldo próprio ou de outro usuário
- ✅ `/daily` - Recompensa diária (500 moedas, cooldown 24h)
- ✅ `/work` - Trabalhar para ganhar moedas (50-150, cooldown 1h)
- ✅ `/pay <user> <amount>` - Transferir moedas entre usuários

#### Mini-Games (2 comandos)
- ✅ `/coinflip <cara/coroa> <aposta>` - Apostar em cara ou coroa (50% chance)
- ✅ `/dice <aposta>` - Jogar dados contra o bot (maior número ganha)

#### Recursos de Economia
- ✅ Cooldowns para prevenir farming
- ✅ Validações de saldo e transações
- ✅ Sistema de apostas com riscos e recompensas
- ✅ Mensagens de trabalho aleatórias
- ✅ Embeds visuais com emojis temáticos
- ✅ Rank econômico integrado ao /balance

### ✅ Fase 5: Entretenimento (Completo)

#### Comandos Fun (5 comandos)
- ✅ `/8ball <pergunta>` - Bola mágica 8 com respostas aleatórias
- ✅ `/roll <dados>` - Rolar dados de RPG (formato: 2d20, 3d6, etc)
- ✅ `/rps <escolha>` - Pedra, papel ou tesoura contra o bot
- ✅ `/avatar [user]` - Ver avatar em alta resolução (até 4096px)
- ✅ `/trivia` - Jogo de perguntas e respostas interativo

#### Recursos de Entretenimento
- ✅ 20 respostas diferentes na bola mágica 8
- ✅ Sistema de dados flexível (1d6 até 100d1000)
- ✅ Visualização colorida de resultados
- ✅ Botões interativos para jogos
- ✅ Sistema de trivia com 10 perguntas
- ✅ Timer de 30 segundos para trivia
- ✅ Múltiplas categorias de perguntas
- ✅ Downloads de avatar em múltiplas resoluções
- ✅ Suporte para avatar de servidor personalizado

---

## Como Configurar

### 1. Pré-requisitos

- Node.js v20.6.0 ou superior
- Uma conta no [Discord Developer Portal](https://discord.com/developers/applications)
- Git (opcional, mas recomendado)

### 2. Criar Aplicação no Discord

1. Acesse https://discord.com/developers/applications
2. Clique em "New Application"
3. Dê um nome (ex: "Hermes")
4. Vá até a seção "Bot"
5. Clique em "Add Bot"
6. **Copie o Token** (você vai precisar dele)

### 3. Configurar Intents do Bot

Na página do Bot, em **Privileged Gateway Intents**, ative:

- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

### 4. Obter IDs Necessários

**CLIENT_ID** (Application ID):
1. Vá em "General Information"
2. Copie o "Application ID"

**GUILD_ID** (Server ID - para testes):
1. No Discord, ative o "Developer Mode" em Configurações > Avançado
2. Clique com botão direito no seu servidor
3. Clique em "Copiar ID"

### 5. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e preencha com seus valores:
```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui
GUILD_ID=seu_guild_id_aqui
NODE_ENV=development
```

### 6. Instalar Dependências

```bash
npm install
```

### 7. Deploy dos Comandos

#### Para desenvolvimento (deploy rápido no servidor de teste):
```bash
npm run deploy-commands -- --guild
```

#### Para produção (deploy global - demora até 1 hora):
```bash
npm run deploy-commands
```

### 8. Convidar o Bot para o Servidor

1. No Discord Developer Portal, vá em "OAuth2" > "URL Generator"
2. Selecione os scopes:
   - `bot`
   - `applications.commands`
3. Selecione as permissões (recomendado: Administrator para desenvolvimento)
4. Copie a URL gerada e abra no navegador
5. Selecione seu servidor e autorize

### 9. Iniciar o Bot

#### Modo de desenvolvimento (com hot reload):
```bash
npm run dev
```

#### Modo de produção:
```bash
npm run build
npm start
```

---

## Testando o Bot

Após iniciar o bot, você deve ver no console:

```
[timestamp] SUCCESS Logged in as YourBot#1234
[timestamp] SUCCESS Bot is ready and serving 1 guild(s)
[timestamp] INFO    Watching XX user(s)
[timestamp] SUCCESS Bot presence set successfully
```

### Testando Comandos

No seu servidor Discord, teste os comandos:

**Utilitários:**
1. `/ping` - Deve mostrar a latência
2. `/help` - Deve listar todos os comandos (23 total)
3. `/userinfo` - Deve mostrar suas informações
4. `/serverinfo` - Deve mostrar informações do servidor
5. `/rank` - Ver seu nível e XP
6. `/leaderboard` - Ver top usuários do servidor

**Moderação (requer permissões):**
7. `/warn @user reason:Teste` - Avisar usuário
8. `/warnings @user` - Ver avisos do usuário
9. `/timeout @user duration:5 reason:Teste` - Timeout de 5 minutos
10. `/kick @user reason:Teste` - Expulsar usuário
11. `/ban @user reason:Teste` - Banir usuário
12. `/clear amount:10` - Deletar 10 mensagens

**Economia:**
13. `/balance` - Ver seu saldo
14. `/daily` - Resgatar recompensa diária (500 moedas)
15. `/work` - Trabalhar para ganhar moedas (50-150)
16. `/pay @user quantia:100` - Transferir 100 moedas
17. `/coinflip lado:cara aposta:50` - Apostar 50 moedas em cara
18. `/dice aposta:100` - Jogar dados contra o bot

**Diversão:**
19. `/8ball pergunta:"Vai chover?"` - Bola mágica 8
20. `/roll dados:2d20` - Rolar 2 dados de 20 lados
21. `/rps escolha:pedra` - Pedra, papel ou tesoura
22. `/avatar @user` - Ver avatar do usuário
23. `/trivia` - Responder pergunta de trivia

---

## Estrutura do Projeto

```
hermes/
├── src/
│   ├── commands/
│   │   ├── utility/       # 6 comandos utilitários ✅
│   │   ├── moderation/    # 6 comandos de moderação ✅
│   │   ├── economy/       # 6 comandos de economia ✅
│   │   ├── fun/          # 5 comandos de diversão ✅
│   │   ├── games/        # (Fase 6)
│   │   └── music/        # (Fase 6)
│   ├── events/
│   │   ├── ready.ts              # Bot startup ✅
│   │   ├── interactionCreate.ts  # Command handler ✅
│   │   ├── messageCreate.ts      # XP tracking ✅
│   │   ├── messageDelete.ts      # Log mensagens deletadas ✅
│   │   ├── messageUpdate.ts      # Log mensagens editadas ✅
│   │   ├── guildMemberAdd.ts     # Boas-vindas ✅
│   │   └── guildMemberRemove.ts  # Despedidas ✅
│   ├── utils/
│   │   ├── logger.ts     # Sistema de logging ✅
│   │   └── embeds.ts     # Embed builders ✅
│   ├── config/
│   │   └── config.ts     # Configuração ✅
│   ├── services/
│   │   └── database.ts   # Prisma client ✅
│   ├── types/
│   │   └── index.ts      # TypeScript types ✅
│   ├── index.ts          # Entry point ✅
│   └── deploy-commands.ts # Deploy script ✅
├── prisma/
│   ├── schema.prisma     # Database schema ✅
│   ├── migrations/       # Database migrations ✅
│   └── dev.db           # SQLite database ✅
├── scripts/
│   └── check-setup.ts   # Setup verification ✅
├── dist/                 # Compilado (gerado)
├── .env                  # Variáveis de ambiente (NÃO COMMITAR)
├── .env.example          # Template ✅
├── package.json          # ✅
├── tsconfig.json         # ✅
├── prisma.config.ts     # Prisma config ✅
├── SETUP.md             # Este arquivo ✅
└── README.md            # ✅
```

---

## Comandos NPM Disponíveis

- `npm run dev` - Inicia em modo desenvolvimento com hot reload
- `npm run build` - Compila TypeScript para JavaScript
- `npm start` - Inicia bot em modo produção (requer build antes)
- `npm run deploy-commands` - Deploy global de comandos
- `npm run deploy-commands -- --guild` - Deploy rápido no servidor de teste

---

## Solução de Problemas

### Bot não conecta
- ✅ Verifique se o token está correto no `.env`
- ✅ Verifique se todos os intents estão ativados
- ✅ Verifique se há erros no console

### Comandos não aparecem
- ✅ Execute `npm run deploy-commands -- --guild` para deploy rápido
- ✅ Aguarde alguns segundos e reinicie o Discord
- ✅ Verifique se o bot tem permissão `applications.commands`

### Erros de permissão
- ✅ Verifique se o bot tem as permissões necessárias no servidor
- ✅ Verifique a hierarquia de roles (bot deve estar acima dos roles que vai gerenciar)

### Erros de TypeScript
- ✅ Execute `npm install` novamente
- ✅ Verifique se está usando Node.js 20.6.0+
- ✅ Delete `node_modules` e `dist`, depois execute `npm install`

---

## Roadmap de Fases

### ✅ Fase 1: MVP Foundation (COMPLETO)
- ✅ Sistema base do bot
- ✅ 4 comandos utilitários
- ✅ Sistema de logging e embeds
- ✅ Deploy automático de comandos

### ✅ Fase 2: Sistema de Moderação (COMPLETO)
- ✅ 6 comandos: ban, kick, timeout, warn, warnings, clear
- ✅ Integração com banco de dados (Prisma + SQLite)
- ✅ Sistema de logs (messageDelete, messageUpdate)
- ✅ Sistema de avisos persistente

### ✅ Fase 3: Engajamento Comunitário (COMPLETO)
- ✅ Sistema de níveis (XP)
- ✅ Comando /rank para ver nível
- ✅ Comando /leaderboard para top usuários
- ✅ Sistema de boas-vindas com mensagens personalizadas
- ✅ Evento guildMemberAdd para boas-vindas
- ✅ Evento guildMemberRemove para despedidas
- ✅ Tracking automático de XP ao enviar mensagens
- ⚪ Auto-roles baseados em nível (opcional - não implementado)

### ✅ Fase 4: Sistema de Economia (COMPLETO)
- ✅ Moeda virtual por servidor
- ✅ Comando /balance (ver saldo e rank)
- ✅ Comando /daily (recompensa diária de 500 moedas)
- ✅ Comando /work (ganhar 50-150 moedas)
- ✅ Comando /pay (transferir moedas)
- ✅ Mini-games: /coinflip e /dice
- ⚪ Sistema de shop (não implementado)
- ⚪ Slots e blackjack (não implementados)

### ✅ Fase 5: Entretenimento (COMPLETO)
- ✅ Comando /8ball (bola mágica 8)
- ✅ Comando /roll (rolar dados de RPG)
- ✅ Comando /rps (pedra, papel, tesoura)
- ✅ Comando /avatar (ver avatar em alta resolução)
- ✅ Comando /trivia (jogo de perguntas e respostas)
- ⚪ Bot de música (não implementado - requer biblioteca externa)
- ⚪ Memes do Reddit (não implementado)

### Fase 6: Features Avançadas
- [ ] Integração com IA (ChatGPT, DALL-E)
- [ ] Sistema de tickets de suporte
- [ ] Dashboard web com Next.js
- [ ] Estatísticas e analytics

---

## Suporte

Para mais informações, consulte:
- [README.md](./README.md) - Documentação completa
- [GUIA_DESENVOLVIMENTO.md](./GUIA_DESENVOLVIMENTO.md) - Guia de desenvolvimento
- [FEATURES.md](./FEATURES.md) - Especificações de features

---

## Status Atual

**Versão:** 5.0.0 (Entertainment System Complete)
**Status:** ✅ Sistema de Entretenimento Completo
**Total de Comandos:** 23 (6 utilitários + 6 moderação + 6 economia + 5 diversão)
**Total de Eventos:** 7 (ready, interactionCreate, messageCreate, messageDelete, messageUpdate, guildMemberAdd, guildMemberRemove)
**Última atualização:** 2025-11-05
