# Guia de Desenvolvimento - Bot Discord

Este guia fornece informações detalhadas sobre como desenvolver o bot Hermes do zero.

## 📖 Conteúdo

- [Setup Inicial](#setup-inicial)
- [Arquitetura](#arquitetura)
- [Implementando Features](#implementando-features)
- [Boas Práticas](#boas-práticas)
- [Troubleshooting](#troubleshooting)

## 🎯 Setup Inicial

### 1. Criar Aplicação no Discord Developer Portal

**Passo a passo detalhado:**

1. Acesse https://discord.com/developers/applications
2. Clique em "New Application"
3. Escolha um nome (ex: "Hermes")
4. Aceite os termos de serviço

**Configurar o Bot:**

1. No menu lateral, clique em "Bot"
2. Clique em "Add Bot"
3. Configure as seguintes opções:
   - **Public Bot**: OFF (se quiser apenas para seus servidores)
   - **Requires OAuth2 Code Grant**: OFF
   - **Presence Intent**: ON (para ver status dos membros)
   - **Server Members Intent**: ON (para eventos de membros)
   - **Message Content Intent**: ON (para ler conteúdo de mensagens)

4. Copie o **Token** (botão "Reset Token" se necessário)
   - ⚠️ **IMPORTANTE**: Nunca compartilhe este token!

**Obter IDs necessários:**

1. **Client ID**: Na página "General Information" > Application ID
2. **Guild ID** (opcional para testes):
   - Ative o Modo Desenvolvedor no Discord (Configurações > Avançado)
   - Clique com botão direito no servidor > Copiar ID

### 2. Convidar Bot para Servidor

**URL de Convite:**

```
https://discord.com/api/oauth2/authorize?client_id=SEU_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

Substitua `SEU_CLIENT_ID` e acesse a URL no navegador.

**Permissões Recomendadas:**

- Administrator (8) - Para facilitar desenvolvimento
- Ou selecione específicas:
  - Manage Roles
  - Manage Channels
  - Kick Members
  - Ban Members
  - Send Messages
  - Embed Links
  - Attach Files
  - Read Message History
  - Add Reactions
  - Use Slash Commands

### 3. Setup do Projeto Node.js

```bash
# Inicializar projeto
npm init -y

# Instalar dependências principais
npm install discord.js
npm install typescript @types/node -D

# Instalar ferramentas de desenvolvimento
npm install ts-node tsx nodemon -D

# Para variáveis de ambiente (opcional no Node 20.6+)
npm install dotenv
```

### 4. Configurar TypeScript

Criar `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Configurar package.json

```json
{
  "name": "hermes",
  "version": "1.0.0",
  "description": "Bot de Discord",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "deploy-commands": "tsx src/deploy-commands.ts"
  },
  "keywords": ["discord", "bot"],
  "author": "",
  "license": "MIT"
}
```

### 6. Estrutura de Arquivos Inicial

```bash
mkdir -p src/{commands,events,utils,services,models,config}
touch src/index.ts
touch src/config/config.ts
touch src/deploy-commands.ts
touch .env .env.example .gitignore
```

### 7. Configurar .gitignore

```gitignore
# Dependencies
node_modules/

# Build
dist/

# Environment
.env
.env.local

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

### 8. Arquivo .env.example

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing (optional)

# Environment
NODE_ENV=development

# Database (quando implementar)
# DATABASE_URL=postgresql://user:password@localhost:5432/hermes
```

## 🏗️ Arquitetura

### Estrutura de Comandos

**Organização por Categoria:**

```
commands/
├── moderation/
│   ├── ban.ts
│   ├── kick.ts
│   └── warn.ts
├── economy/
│   ├── balance.ts
│   ├── daily.ts
│   └── shop.ts
├── fun/
│   ├── meme.ts
│   └── 8ball.ts
└── utility/
    ├── ping.ts
    ├── help.ts
    └── userinfo.ts
```

**Estrutura de um Comando:**

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('nome-do-comando')
    .setDescription('Descrição do comando')
    .addStringOption(option =>
        option
            .setName('opcao')
            .setDescription('Descrição da opção')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Lógica do comando
        await interaction.reply('Resposta');
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'Ocorreu um erro ao executar o comando!',
            ephemeral: true
        });
    }
}
```

### Sistema de Events

**Events Principais:**

```
events/
├── ready.ts           # Bot online
├── interactionCreate.ts  # Slash commands
├── messageCreate.ts   # Mensagens (se necessário)
├── guildMemberAdd.ts # Novo membro
└── guildMemberRemove.ts # Membro saiu
```

**Exemplo de Event Handler:**

```typescript
import { Client, Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client) {
    console.log(`✅ Bot online como ${client.user?.tag}`);
}
```

### Bot Principal (index.ts)

```typescript
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config/config';

// Criar cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

// Carregar comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Comando carregado: ${command.data.name}`);
        }
    }
}

// Carregar events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Event carregado: ${event.name}`);
}

// Login
client.login(config.token);
```

### Deploy de Comandos (deploy-commands.ts)

```typescript
import { REST, Routes } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config/config';

const commands: any[] = [];

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

// Registrar comandos
const rest = new REST().setToken(config.token);

(async () => {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos...`);

        const data: any = await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands },
        );

        console.log(`✅ ${data.length} comandos registrados!`);
    } catch (error) {
        console.error(error);
    }
})();
```

## 💡 Implementando Features

### 1. Sistema de Leveling

**Estrutura:**

```typescript
// models/UserLevel.ts
export interface UserLevel {
    userId: string;
    guildId: string;
    xp: number;
    level: number;
    lastMessageTime: number;
}

// services/leveling.ts
export class LevelingService {
    private static calculateLevelFromXP(xp: number): number {
        return Math.floor(0.1 * Math.sqrt(xp));
    }

    private static calculateXPForLevel(level: number): number {
        return Math.pow(level / 0.1, 2);
    }

    static addXP(userId: string, guildId: string, xp: number): UserLevel {
        // Implementar lógica de adicionar XP
        // Salvar no database
        // Verificar se subiu de nível
        // Retornar dados atualizados
    }

    static async checkLevelUp(oldXP: number, newXP: number): Promise<boolean> {
        const oldLevel = this.calculateLevelFromXP(oldXP);
        const newLevel = this.calculateLevelFromXP(newXP);
        return newLevel > oldLevel;
    }
}

// events/messageCreate.ts
import { Events, Message } from 'discord.js';
import { LevelingService } from '../services/leveling';

export const name = Events.MessageCreate;

export async function execute(message: Message) {
    if (message.author.bot) return;

    // Cooldown de 60 segundos entre mensagens que dão XP
    const xpToAdd = Math.floor(Math.random() * 15) + 10; // 10-25 XP

    const userData = LevelingService.addXP(
        message.author.id,
        message.guild!.id,
        xpToAdd
    );

    // Verificar level up
    if (await LevelingService.checkLevelUp(userData.xp - xpToAdd, userData.xp)) {
        message.channel.send(
            `🎉 Parabéns ${message.author}, você subiu para o nível ${userData.level}!`
        );
    }
}
```

### 2. Sistema de Economia

```typescript
// services/economy.ts
export class EconomyService {
    private static readonly DAILY_AMOUNT = 1000;
    private static readonly DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 horas

    static async getBalance(userId: string, guildId: string): Promise<number> {
        // Buscar do database
        return 0;
    }

    static async addCoins(userId: string, guildId: string, amount: number): Promise<void> {
        // Adicionar moedas
    }

    static async removeCoins(userId: string, guildId: string, amount: number): Promise<boolean> {
        const balance = await this.getBalance(userId, guildId);
        if (balance < amount) return false;

        // Remover moedas
        return true;
    }

    static async claimDaily(userId: string, guildId: string): Promise<{ success: boolean; amount?: number; cooldown?: number }> {
        // Verificar cooldown
        // Dar moedas diárias
        return { success: true, amount: this.DAILY_AMOUNT };
    }
}

// commands/economy/balance.ts
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { EconomyService } from '../../services/economy';

export const data = new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Ver seu saldo')
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Ver saldo de outro usuário')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const balance = await EconomyService.getBalance(user.id, interaction.guildId!);

    await interaction.reply(`💰 ${user.username} tem **${balance}** moedas!`);
}
```

### 3. Sistema de Moderação

```typescript
// commands/moderation/ban.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuário')
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Usuário a ser banido')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('motivo')
            .setDescription('Motivo do banimento')
            .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Sem motivo especificado';

    try {
        await interaction.guild?.members.ban(user, { reason });
        await interaction.reply(`✅ ${user.tag} foi banido. Motivo: ${reason}`);

        // Log em canal de moderação
        // Salvar no database
    } catch (error) {
        await interaction.reply({
            content: '❌ Não foi possível banir este usuário.',
            ephemeral: true
        });
    }
}
```

### 4. Sistema de Tickets

```typescript
// commands/utility/ticket.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Criar um ticket de suporte')
    .addStringOption(option =>
        option
            .setName('assunto')
            .setDescription('Assunto do ticket')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subject = interaction.options.getString('assunto', true);
    const guild = interaction.guild!;
    const user = interaction.user;

    // Criar canal de ticket
    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: 'CATEGORIA_DE_TICKETS_ID', // Configurar
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            // Adicionar staff roles
        ],
    });

    await ticketChannel.send(
        `Ticket aberto por ${user}\n**Assunto:** ${subject}\n\nUm membro da equipe irá atendê-lo em breve.`
    );

    await interaction.reply({
        content: `✅ Ticket criado: ${ticketChannel}`,
        ephemeral: true
    });
}
```

## 🎨 Boas Práticas

### 1. Embeds Reutilizáveis

```typescript
// utils/embeds.ts
import { EmbedBuilder, ColorResolvable } from 'discord.js';

export class EmbedFactory {
    static createSuccessEmbed(title: string, description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`✅ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static createErrorEmbed(title: string, description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .setTimestamp();
    }

    static createInfoEmbed(title: string, description: string): EmbedBuilder {
        return new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }
}
```

### 2. Sistema de Logs

```typescript
// utils/logger.ts
export class Logger {
    static info(message: string): void {
        console.log(`[INFO] [${new Date().toISOString()}] ${message}`);
    }

    static error(message: string, error?: any): void {
        console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error);
    }

    static warn(message: string): void {
        console.warn(`[WARN] [${new Date().toISOString()}] ${message}`);
    }

    static debug(message: string): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`);
        }
    }
}
```

### 3. Validações

```typescript
// utils/validators.ts
export class Validators {
    static isValidUserId(id: string): boolean {
        return /^\d{17,19}$/.test(id);
    }

    static isValidAmount(amount: number): boolean {
        return amount > 0 && Number.isInteger(amount);
    }

    static sanitizeString(str: string): string {
        return str.trim().slice(0, 2000); // Limite do Discord
    }
}
```

### 4. Error Handling Global

```typescript
// Adicionar ao index.ts
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});
```

## 🐛 Troubleshooting

### Problemas Comuns

**1. Bot não responde a comandos**
- Verifique se os intents estão ativados no Developer Portal
- Rode `npm run deploy-commands` para registrar os comandos
- Verifique se o bot tem permissões no servidor

**2. "Missing Access" error**
- O bot precisa das permissões corretas no canal/servidor
- Verifique a hierarquia de roles

**3. Token inválido**
- Regenere o token no Developer Portal
- Atualize o .env

**4. Comandos não aparecem**
- Comandos de guild podem levar até 1 hora para aparecer
- Use comandos globais para produção
- Verifique se o bot tem permissão `applications.commands`

**5. Rate Limiting**
- Discord tem limites de requisições
- Implemente cooldowns nos comandos
- Use cache quando possível

### Debug Tips

```typescript
// Ativar debug do Discord.js
// No seu index.ts
client.on('debug', console.log);

// Ver todos os eventos
client.on('raw', (packet) => {
    console.log('Raw packet:', packet.t);
});
```

## 📚 Próximos Passos

1. ✅ Setup básico do bot
2. ⏳ Implementar comandos essenciais (ping, help)
3. ⏳ Adicionar database (PostgreSQL/MongoDB)
4. ⏳ Sistema de leveling
5. ⏳ Sistema de economia
6. ⏳ Sistema de moderação
7. ⏳ Dashboard web
8. ⏳ Testes automatizados
9. ⏳ CI/CD
10. ⏳ Deploy em produção

---

💡 **Dica**: Comece simples! Implemente um recurso por vez e teste bem antes de adicionar o próximo.
