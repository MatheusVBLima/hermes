import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const FALLBACK_QUOTES: string[] = [
    'Amar é uma arte, então por favor sejamos artistas.',
    'Quase sempre ao deitar, penso em você, só para poder te encontrar seja no meu sonho, ou do meu lado quando eu acordar.',
    'Avalio-me, logo se apaixono.',
    'Viver não é só dormir e acordar, é plantar, regar e colher.',
    'O amor é um remédio que devemos tomar todos dias.',
    'O dinheiro mata algumas pessoas, enquanto outras pessoas se matam pelo dinheiro.',
    'Enquanto uns dizem Mixaria, outros dizem Graças a Deus.',
    'O sucesso está na alegria de viver, na busca pelo fazer; o sucesso não te permite reclamar ou invejar, obriga a agradecer, gratidão!',
    'Levei uma rosa, ela aceitou; levei um chocolate, ela também aceitou. Mas quando lhe ofereci o meu amor, ela recusou.',
    'Não fica aí parado pensando no que fazer, apenas faça.',
    'Ouça o que teu coração tem para lhe dizer, e deixe que seu cérebro o responda.',
    'Perdão, por eu ser apenas eu e não aquilo que você precisava.',
    'Escrever é a chave mestra da porta do pensamento.',
    'Minha melhor arma para todos os combates foi a educação.',
    'Quando escrevo posso sentir um alívio cerebral; é como se escrever fosse um calmante para o corpo e mente.',
];

async function loadQuotes(): Promise<string[]> {
    try {
        const filePath = path.resolve(process.cwd(), 'data', 'cestari-quotes.json');
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            const deduped = Array.from(new Set(parsed.map((q) => String(q).trim()).filter((q) => q.length > 0)));
            return deduped.length > 0 ? deduped : FALLBACK_QUOTES;
        }
    } catch {
        // Fallback silencioso
    }
    return FALLBACK_QUOTES;
}

export const data = new SlashCommandBuilder()
    .setName('cestari')
    .setDescription('Envia uma frase aleatória de Cestari');

export async function execute(interaction: ChatInputCommandInteraction) {
    const quotes = await loadQuotes();
    const choice = quotes[Math.floor(Math.random() * quotes.length)];
    await interaction.reply({ content: `💬 ${choice}` });
}

