# Hermes Bot - Setup Guide

## Fase 1: MVP Completo! ✅

O bot está pronto para uso básico com os seguintes recursos implementados:

### Recursos Implementados

#### Arquitetura
- ✅ Sistema de carregamento automático de comandos
- ✅ Sistema de carregamento automático de eventos
- ✅ Estrutura modular organizada por categorias
- ✅ Sistema de logging com cores e timestamps
- ✅ Tratamento de erros global
- ✅ TypeScript com strict mode

#### Comandos Utilitários
- ✅ `/ping` - Verificar latência do bot
- ✅ `/help` - Listar todos os comandos disponíveis
- ✅ `/userinfo` - Informações detalhadas sobre usuários
- ✅ `/serverinfo` - Estatísticas completas do servidor

#### Sistema de Utilitários
- ✅ Logger colorido e estruturado
- ✅ Embed builders reutilizáveis
- ✅ Validação de configuração
- ✅ Gerenciamento de ambiente

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

1. `/ping` - Deve mostrar a latência
2. `/help` - Deve listar todos os comandos
3. `/userinfo` - Deve mostrar suas informações
4. `/serverinfo` - Deve mostrar informações do servidor

---

## Estrutura do Projeto

```
hermes/
├── src/
│   ├── commands/
│   │   ├── utility/       # Comandos utilitários
│   │   ├── moderation/    # (Fase 2)
│   │   ├── economy/       # (Fase 4)
│   │   ├── fun/          # (Fase 5)
│   │   ├── games/        # (Fase 5)
│   │   └── music/        # (Fase 5)
│   ├── events/
│   │   ├── ready.ts              # Bot startup
│   │   └── interactionCreate.ts  # Command handler
│   ├── utils/
│   │   ├── logger.ts     # Sistema de logging
│   │   └── embeds.ts     # Embed builders
│   ├── config/
│   │   └── config.ts     # Configuração
│   ├── services/         # (Futuro)
│   ├── models/           # (Futuro)
│   ├── index.ts          # Entry point
│   └── deploy-commands.ts # Deploy script
├── dist/                 # Compilado (gerado)
├── .env                  # Variáveis de ambiente (NÃO COMMITAR)
├── .env.example          # Template
├── package.json
├── tsconfig.json
└── README.md
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

## Próximas Fases

### Fase 2: Sistema de Moderação (Próximo)
- [ ] Comandos: ban, kick, timeout, warn, clear
- [ ] Integração com banco de dados
- [ ] Sistema de logs
- [ ] Auto-moderação

### Fase 3: Engajamento Comunitário
- [ ] Sistema de níveis (XP)
- [ ] Leaderboard
- [ ] Sistema de boas-vindas
- [ ] Auto-roles

### Fase 4: Economia
- [ ] Moeda virtual
- [ ] Daily rewards
- [ ] Mini-games
- [ ] Shop system

### Fase 5: Entretenimento
- [ ] Bot de música
- [ ] Comandos fun
- [ ] Jogos interativos

### Fase 6: Features Avançadas
- [ ] Integração com IA (ChatGPT, DALL-E)
- [ ] Sistema de tickets
- [ ] Dashboard web

---

## Suporte

Para mais informações, consulte:
- [README.md](./README.md) - Documentação completa
- [GUIA_DESENVOLVIMENTO.md](./GUIA_DESENVOLVIMENTO.md) - Guia de desenvolvimento
- [FEATURES.md](./FEATURES.md) - Especificações de features

---

## Status Atual

**Versão:** 1.0.0 (MVP)
**Status:** ✅ Pronto para uso básico
**Última atualização:** 2025-11-04
