# Hermes - Bot de Discord

Bot de Discord desenvolvido com TypeScript e Discord.js v14.

## 📋 Índice

- [Sobre](#sobre)
- [Tecnologias](#tecnologias)
- [Features Planejadas](#features-planejadas)
- [Começando](#começando)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Desenvolvimento](#desenvolvimento)
- [Deploy](#deploy)
- [Recursos](#recursos)

## 🤖 Sobre

Hermes é um bot de Discord moderno, construído com as melhores práticas de desenvolvimento em 2025, incluindo TypeScript para segurança de tipos, arquitetura modular, e suporte completo para Slash Commands.

## 🛠️ Tecnologias

- **Node.js** (v20.6.0+) - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Discord.js v14** - Biblioteca para interação com a API do Discord
- **dotenv** - Gerenciamento de variáveis de ambiente (ou usar `--env-file` nativo do Node 20.6.0+)

## ✨ Features Planejadas

### 🛡️ Moderação e Gerenciamento
- **Sistema de Moderação Automatizada**
  - Warnings, mutes, kicks e bans automáticos
  - Detecção de spam e flood
  - Filtro de palavras proibidas
  - Logs de ações de moderação

- **Sistema de Boas-Vindas**
  - Mensagens personalizadas para novos membros
  - Sistema de onboarding automático
  - Atribuição de roles iniciais

### 🎮 Engajamento da Comunidade
- **Sistema de Níveis (Leveling)**
  - XP baseado em atividade
  - Roles automáticas por nível
  - Leaderboard da comunidade
  - Recompensas personalizadas

- **Sistema de Economia**
  - Moeda virtual do servidor
  - Loja de items e roles
  - Missões diárias e recompensas
  - Mini-games (coinflip, roleta, etc.)

- **Sistema de Tickets**
  - Suporte organizado por categorias
  - Logs de conversas
  - Sistema de avaliação

### 🤖 Features com IA
- **Chatbot com IA**
  - Integração com ChatGPT/GPT-4
  - Respostas contextuais
  - Modo de conversação

- **Geração de Imagens**
  - Criar imagens a partir de prompts
  - Integração com DALL-E ou Stable Diffusion

### 🎵 Entretenimento
- **Bot de Música**
  - Reprodução de YouTube, Spotify, SoundCloud
  - Fila de músicas
  - Controles (pause, skip, volume)
  - Playlists salvas

- **Mini-Games**
  - Jogos de RPG text-based
  - Trivia e quizzes
  - Jogos multiplayer

### 📊 Utilidades
- **Sistema de Enquetes**
  - Votações com múltiplas opções
  - Resultados em tempo real
  - Enquetes agendadas

- **Lembretes e Agendamentos**
  - Lembretes pessoais
  - Eventos da comunidade
  - Integração com calendário

- **Comandos de Informação**
  - Info do servidor
  - Info de usuários
  - Estatísticas do bot

### 🔧 Administração
- **Dashboard Web** (futuro)
  - Configuração visual do bot
  - Estatísticas e analytics
  - Gerenciamento de permissões

## 🚀 Começando

### Pré-requisitos

- Node.js 20.6.0 ou superior
- npm ou yarn
- Conta Discord Developer

### Criar Aplicação no Discord

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Dê um nome ao seu bot
4. Vá em "Bot" no menu lateral
5. Clique em "Add Bot"
6. Copie o **Token** (mantenha seguro!)
7. Em "OAuth2" > "URL Generator":
   - Selecione `bot` e `applications.commands` em Scopes
   - Selecione as permissões necessárias
   - Copie a URL gerada e use para adicionar o bot ao servidor

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/hermes.git
cd hermes

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

### Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id
GUILD_ID=seu_guild_id_para_testes (opcional)
```

### Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start

# Registrar comandos slash
npm run deploy-commands
```

## 📁 Estrutura do Projeto

```
hermes/
├── src/
│   ├── commands/           # Comandos slash organizados por categoria
│   │   ├── moderation/
│   │   ├── economy/
│   │   ├── fun/
│   │   └── utility/
│   ├── events/            # Event handlers do Discord
│   │   ├── ready.ts
│   │   ├── interactionCreate.ts
│   │   └── messageCreate.ts
│   ├── utils/             # Funções utilitárias
│   │   ├── logger.ts
│   │   ├── embeds.ts
│   │   └── validators.ts
│   ├── services/          # Lógica de negócio
│   │   ├── database.ts
│   │   ├── economy.ts
│   │   └── leveling.ts
│   ├── models/            # Modelos de dados
│   │   ├── User.ts
│   │   └── Guild.ts
│   ├── config/            # Configurações
│   │   └── config.ts
│   └── index.ts           # Entry point
├── .env                   # Variáveis de ambiente
├── .env.example           # Exemplo de variáveis
├── tsconfig.json          # Configuração TypeScript
├── package.json
└── README.md
```

## 💻 Desenvolvimento

### Comandos Slash

Os comandos slash são a forma moderna de interagir com bots no Discord. Exemplo básico:

```typescript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Responde com Pong!');

export async function execute(interaction: any) {
    await interaction.reply('Pong!');
}
```

### Boas Práticas

1. **TypeScript**: Use tipagem forte para evitar erros em runtime
2. **Modularização**: Mantenha cada comando em arquivo separado
3. **Error Handling**: Sempre trate erros adequadamente
4. **Logging**: Implemente sistema de logs estruturado
5. **Testes**: Escreva testes para lógica crítica
6. **Segurança**: Nunca commite tokens ou credenciais
7. **Performance**: Use cache quando possível
8. **Princípios SOLID**: Mantenha código testável e manutenível

### Escalabilidade

- **Sharding**: Necessário quando o bot atinge 2500+ servidores
- **Database**: Use PostgreSQL ou MongoDB para dados persistentes
- **Cache**: Redis para performance
- **Queue System**: Bull/BullMQ para tarefas assíncronas

## 🚀 Deploy

### Opções de Hospedagem

1. **Railway** - Fácil deploy com Git
2. **Heroku** - Tradicional, plano gratuito limitado
3. **DigitalOcean** - VPS com controle total
4. **AWS EC2** - Escalável para produção
5. **Replit** - Ótimo para testes

### Docker (Recomendado)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 📚 Recursos

### Documentação Oficial
- [Discord.js Guide](https://discordjs.guide/)
- [Discord.js Documentation](https://discord.js.org/)
- [Discord API Documentation](https://discord.com/developers/docs)

### Tutoriais Recomendados
- [Creating Discord Bots with TypeScript](https://www.xjavascript.com/blog/discord-bots-in-typescript/)
- [Discord.js v14 Command Handlers](https://github.com/Nathaniel-VFX/Discord.js-v14-Command-Handlers)
- [FreeCodeCamp Discord Bot Tutorial](https://www.freecodecamp.org/news/build-a-100-days-of-code-discord-bot-with-typescript-mongodb-and-discord-js-13/)

### Comunidades
- [Discord.js Server](https://discord.gg/djs)
- [Discord API Server](https://discord.gg/discord-api)

## 📝 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

---

Desenvolvido com ❤️ usando Discord.js
