import fs from 'node:fs/promises';
import path from 'node:path';

const urls = [
    'https://www.pensador.com/autor/leonardo_cestari/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/2/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/3/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/4/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/5/',
    'https://www.pensador.com/autor/leonardo_cestari_silva/6/',
];

function decodeHtml(text: string): string {
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function extractQuotes(html: string): string[] {
    const quotes: string[] = [];
    const regex = /<p[^>]*class="[^"]*frase[^"]*"[^>]*>([\s\S]*?)<\/p>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
        const raw = match[1]
            .replace(/<[^>]+>/g, '')
            .trim();
        if (raw.length === 0) continue;
        quotes.push(decodeHtml(raw));
    }
    return quotes;
}

async function fetchQuotesFromUrl(url: string): Promise<string[]> {
    const res = await fetch(url, {
        headers: {
            'user-agent': 'Mozilla/5.0 (compatible; CestariBot/1.0)',
        },
    });
    if (!res.ok) {
        throw new Error(`Falha ao buscar ${url}: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    return extractQuotes(html);
}

async function main() {
    const allQuotes: string[] = [];
    for (const url of urls) {
        console.log(`Buscando ${url}`);
        const quotes = await fetchQuotesFromUrl(url);
        console.log(` -> ${quotes.length} frases`);
        allQuotes.push(...quotes);
    }

    const deduped = Array.from(
        new Set(
            allQuotes
                .map((q) => q.trim())
                .filter((q) => q.length > 0)
        )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const outPath = path.resolve(process.cwd(), 'data', 'cestari-quotes.json');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(deduped, null, 2), 'utf8');

    console.log(`Salvo ${deduped.length} frases em ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

