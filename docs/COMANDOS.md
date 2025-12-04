# 📚 Guia Completo de Comandos - Bot Hermes

Este documento contém todos os comandos disponíveis no bot Hermes, organizados por categoria.

---

## 📋 Índice

- [Moderação](#-moderação)
- [Utilidade](#-utilidade)
- [Diversão](#-diversão)
- [Economia](#-economia)
- [Música](#-música)
- [Administração](#-administração)

---

## 🛡️ Moderação

### `/ban`
Banir um usuário do servidor.

**Permissão necessária:** Banir Membros

**Parâmetros:**
- `usuario` - Usuário a ser banido (obrigatório)
- `motivo` - Motivo do banimento (opcional)
- `dias-deletar` - Dias de mensagens para deletar: 0-7 (opcional)

**Exemplo:**
```
/ban usuario:@Usuario motivo:Spam dias-deletar:7
```

---

### `/kick`
Expulsar um usuário do servidor.

**Permissão necessária:** Expulsar Membros

**Parâmetros:**
- `usuario` - Usuário a ser expulso (obrigatório)
- `motivo` - Motivo da expulsão (opcional)

**Exemplo:**
```
/kick usuario:@Usuario motivo:Comportamento inadequado
```

---

### `/timeout`
Silenciar temporariamente um usuário.

**Permissão necessária:** Moderar Membros

**Parâmetros:**
- `usuario` - Usuário a silenciar (obrigatório)
- `duracao` - Duração em minutos: 1-40320 (28 dias) (obrigatório)
- `motivo` - Motivo do timeout (opcional)

**Exemplo:**
```
/timeout usuario:@Usuario duracao:60 motivo:Flood
```

---

### `/warn`
Dar uma advertência a um usuário.

**Permissão necessária:** Moderar Membros

**Parâmetros:**
- `usuario` - Usuário a advertir (obrigatório)
- `motivo` - Motivo da advertência (obrigatório)

**Exemplo:**
```
/warn usuario:@Usuario motivo:Desrespeito às regras
```

---

### `/warnings`
Ver histórico de advertências de um usuário.

**Permissão necessária:** Moderar Membros

**Parâmetros:**
- `usuario` - Usuário para verificar (obrigatório)

**Exemplo:**
```
/warnings usuario:@Usuario
```

---

### `/clear`
Deletar mensagens em massa.

**Permissão necessária:** Gerenciar Mensagens

**Parâmetros:**
- `quantidade` - Número de mensagens: 1-100 (obrigatório)
- `usuario` - Deletar apenas de um usuário (opcional)

**Exemplo:**
```
/clear quantidade:50
/clear quantidade:20 usuario:@Usuario
```

---

## 🔧 Utilidade

### `/ping`
Verificar latência do bot.

**Exemplo:**
```
/ping
```

**Retorna:**
- Latência do bot
- Latência da API do Discord

---

### `/help`
Listar todos os comandos disponíveis.

**Exemplo:**
```
/help
```

---

### `/rank`
Ver seu nível e XP atual.

**Parâmetros:**
- `usuario` - Ver rank de outro usuário (opcional)

**Exemplo:**
```
/rank
/rank usuario:@Usuario
```

---

### `/leaderboard`
Ver ranking de XP do servidor.

**Exemplo:**
```
/leaderboard
```

Mostra os top 10 usuários com mais XP.

---

### `/userinfo`
Ver informações detalhadas de um usuário.

**Parâmetros:**
- `usuario` - Usuário para ver informações (opcional, padrão: você)

**Exemplo:**
```
/userinfo
/userinfo usuario:@Usuario
```

**Mostra:**
- Nome e tag
- ID do usuário
- Data de criação da conta
- Data de entrada no servidor
- Cargos
- Status
- Avatar

---

### `/serverinfo`
Ver informações do servidor.

**Exemplo:**
```
/serverinfo
```

**Mostra:**
- Nome e ID do servidor
- Dono
- Data de criação
- Contagem de membros
- Contagem de canais
- Contagem de cargos
- Nível de verificação
- Boost info

---

### `/remind`
Sistema de lembretes pessoais.

#### Subcomandos:

**`/remind create`** - Criar um lembrete
- `tempo` - Tempo (ex: 1h, 30m, 2d) (obrigatório)
- `mensagem` - Mensagem do lembrete (obrigatório)

**`/remind list`** - Ver seus lembretes ativos

**`/remind cancel`** - Cancelar um lembrete
- `id` - ID do lembrete (obrigatório)

**Formatos de tempo:**
- `s` - segundos (ex: 30s)
- `m` - minutos (ex: 15m)
- `h` - horas (ex: 2h)
- `d` - dias (ex: 1d)

**Limites:**
- Mínimo: 10 segundos
- Máximo: 30 dias

**Exemplos:**
```
/remind create tempo:30m mensagem:Verificar o servidor
/remind list
/remind cancel id:5
```

---

## 🎮 Diversão

### `/8ball`
Perguntar à bola 8 mágica.

**Parâmetros:**
- `pergunta` - Sua pergunta (obrigatório)

**Exemplo:**
```
/8ball pergunta:Vou ganhar na loteria?
```

---

### `/avatar`
Ver avatar de um usuário em alta resolução.

**Parâmetros:**
- `usuario` - Usuário para ver avatar (opcional, padrão: você)

**Exemplo:**
```
/avatar
/avatar usuario:@Usuario
```

---

### `/roll`
Rolar dados (formato NdX).

**Parâmetros:**
- `dados` - Formato NdX (ex: 2d6, 1d20) (opcional, padrão: 1d6)

**Exemplos:**
```
/roll
/roll dados:2d20
/roll dados:3d6
```

---

### `/rps`
Jogar pedra, papel ou tesoura.

**Parâmetros:**
- `escolha` - Sua escolha (obrigatório)

**Exemplo:**
```
/rps escolha:pedra
```

---

### `/trivia`
Responder perguntas de conhecimentos gerais.

**Parâmetros:**
- `categoria` - Categoria da pergunta (opcional)

**Categorias disponíveis:**
- Ciência & Natureza
- Geografia
- História
- Entretenimento: Música
- Entretenimento: Filmes & TV
- Esportes
- Conhecimentos Gerais

**Exemplo:**
```
/trivia
/trivia categoria:História
```

---

### `/poll`
Criar uma enquete com votação por botões.

**Parâmetros:**
- `pergunta` - Pergunta da enquete (obrigatório)
- `opcao1` - Primeira opção (obrigatório)
- `opcao2` - Segunda opção (obrigatório)
- `opcao3` - Terceira opção (opcional)
- `opcao4` - Quarta opção (opcional)
- `opcao5` - Quinta opção (opcional)
- `duracao` - Duração em minutos: 1-1440 (opcional)

**Exemplo:**
```
/poll pergunta:"Qual o melhor jogo?" opcao1:Minecraft opcao2:Fortnite opcao3:Valorant duracao:60
```

**Como funciona:**
- Clique nos botões numerados para votar
- Você pode mudar seu voto clicando em outra opção
- Clique na mesma opção para remover seu voto
- O criador pode encerrar a enquete com o botão "Encerrar"

---

## 💰 Economia

### `/balance`
Ver seu saldo de moedas.

**Parâmetros:**
- `usuario` - Ver saldo de outro usuário (opcional)

**Exemplo:**
```
/balance
/balance usuario:@Usuario
```

---

### `/daily`
Recompensa diária de 500 moedas.

**Cooldown:** 24 horas

**Exemplo:**
```
/daily
```

---

### `/work`
Trabalhar para ganhar moedas (50-150).

**Cooldown:** 1 hora

**Exemplo:**
```
/work
```

---

### `/pay`
Transferir moedas para outro usuário.

**Parâmetros:**
- `usuario` - Usuário para transferir (obrigatório)
- `quantia` - Quantidade de moedas (obrigatório)

**Exemplo:**
```
/pay usuario:@Usuario quantia:500
```

---

### `/coinflip`
Apostar em cara ou coroa.

**Parâmetros:**
- `aposta` - Quantidade para apostar: 10+ (obrigatório)
- `escolha` - cara ou coroa (obrigatório)

**Exemplo:**
```
/coinflip aposta:100 escolha:cara
```

**Resultado:**
- Ganhou: recebe o dobro da aposta
- Perdeu: perde a aposta

---

### `/dice`
Apostar em dados (1-6).

**Parâmetros:**
- `aposta` - Quantidade para apostar: 10+ (obrigatório)
- `numero` - Número de 1-6 (obrigatório)

**Exemplo:**
```
/dice aposta:100 numero:6
```

**Resultado:**
- Acertou: ganha 6x a aposta
- Errou: perde a aposta

---

### `/rob`
Tentar roubar moedas de outro usuário.

**Parâmetros:**
- `usuario` - Usuário para roubar (obrigatório)

**Cooldown:** 1 hora

**Requisitos:**
- Você precisa ter no mínimo 500 moedas
- O alvo precisa ter no mínimo 500 moedas
- Você não pode roubar a si mesmo ou bots

**Mecânica:**
- 45% de chance de sucesso
- Sucesso: rouba 10-30% do saldo do alvo
- Falha: perde 30% do seu saldo como multa

**Exemplo:**
```
/rob usuario:@Usuario
```

---

### `/slots`
Jogar na máquina caça-níqueis.

**Parâmetros:**
- `aposta` - Quantidade para apostar: 10+ (obrigatório)

**Símbolos e Multiplicadores:**
- 💎💎💎 - x10
- 7️⃣7️⃣7️⃣ - x7
- 🍇🍇🍇 - x5
- 🍊🍊🍊 - x4
- 🍋🍋🍋 - x3
- 🍒🍒🍒 - x2
- 2 símbolos iguais - recupera metade da aposta

**Exemplo:**
```
/slots aposta:100
```

---

### `/blackjack`
Jogar Blackjack (21) contra o dealer.

**Parâmetros:**
- `aposta` - Quantidade para apostar: 10+ (obrigatório)

**Como jogar:**
1. Você recebe 2 cartas
2. Dealer recebe 2 cartas (1 oculta)
3. Clique em **Hit** para pegar mais cartas
4. Clique em **Stand** para parar
5. Objetivo: chegar o mais próximo de 21 sem ultrapassar

**Valores das cartas:**
- A (Ás) = 11 ou 1
- 2-10 = valor da carta
- J, Q, K = 10

**Resultados:**
- Blackjack (21 com 2 cartas): x2.5
- Vitória normal: x2
- Empate: recupera a aposta
- Derrota: perde a aposta

**Exemplo:**
```
/blackjack aposta:100
```

---

### `/shop`
Sistema de loja do servidor.

#### Subcomandos:

**`/shop view`** - Ver itens disponíveis

**`/shop buy`** - Comprar um item
- `item` - ID do item (obrigatório)

**`/shop add`** - Adicionar item à loja (Admin)
- `nome` - Nome do item (obrigatório)
- `preco` - Preço (obrigatório)
- `tipo` - role ou custom (obrigatório)
- `cargo` - Cargo a ser dado (se tipo for role)
- `descricao` - Descrição (opcional)
- `emoji` - Emoji (opcional)

**`/shop remove`** - Remover item da loja (Admin)
- `item` - ID do item (obrigatório)

**Exemplos:**
```
/shop view
/shop buy item:1
/shop add nome:"VIP" preco:5000 tipo:role cargo:@VIP descricao:"Cargo VIP" emoji:⭐
/shop remove item:1
```

---

### `/inventory`
Ver seu inventário de itens comprados.

**Parâmetros:**
- `usuario` - Ver inventário de outro usuário (opcional)

**Exemplo:**
```
/inventory
/inventory usuario:@Usuario
```

---

## 🎵 Música

### `/play`
Tocar uma música do YouTube.

**Parâmetros:**
- `busca` - Nome ou URL da música (obrigatório)

**Exemplo:**
```
/play busca:Imagine Dragons Believer
/play busca:https://youtube.com/watch?v=...
```

---

### `/pause`
Pausar a música atual.

**Exemplo:**
```
/pause
```

---

### `/resume`
Retomar a música pausada.

**Exemplo:**
```
/resume
```

---

### `/skip`
Pular para a próxima música.

**Exemplo:**
```
/skip
```

---

### `/stop`
Parar a música e limpar a fila.

**Exemplo:**
```
/stop
```

---

### `/queue`
Ver a fila de músicas.

**Exemplo:**
```
/queue
```

Mostra até 10 músicas da fila.

---

### `/nowplaying`
Ver informações da música atual.

**Exemplo:**
```
/nowplaying
```

**Mostra:**
- Título e autor
- Duração
- Barra de progresso
- Quem solicitou

---

### `/fix`
Diagnosticar problemas de conexão de voz.

**Exemplo:**
```
/fix
```

Use se o bot não estiver tocando música corretamente.

---

## ⚙️ Administração

### `/reactionrole`
Sistema de cargos por reação.

**Permissão necessária:** Gerenciar Cargos

#### Subcomandos:

**`/reactionrole create`** - Criar mensagem de cargo
- `canal` - Canal para enviar (obrigatório)
- `titulo` - Título da mensagem (obrigatório)
- `descricao` - Descrição (obrigatório)

**`/reactionrole add`** - Adicionar cargo a uma mensagem
- `message-id` - ID da mensagem (obrigatório)
- `emoji` - Emoji (obrigatório)
- `cargo` - Cargo a dar (obrigatório)

**`/reactionrole remove`** - Remover cargo de uma mensagem
- `message-id` - ID da mensagem (obrigatório)
- `emoji` - Emoji (obrigatório)

**`/reactionrole list`** - Ver todos os reaction roles

**Exemplos:**
```
/reactionrole create canal:#roles titulo:"Escolha seus cargos" descricao:"React para pegar cargos"
/reactionrole add message-id:123456789 emoji:🎮 cargo:@Gamer
/reactionrole remove message-id:123456789 emoji:🎮
/reactionrole list
```

---

### `/automod`
Sistema de auto-moderação.

**Permissão necessária:** Gerenciar Servidor

#### Subcomandos:

**`/automod status`** - Ver configurações atuais

**`/automod antispam`** - Configurar anti-spam
- `ativo` - Ativar/desativar (obrigatório)
- `limite` - Mensagens antes de agir: 2-20 (opcional)
- `intervalo` - Intervalo em segundos: 1-60 (opcional)
- `acao` - timeout, kick ou warn (opcional)

**`/automod antiflood`** - Configurar anti-flood (mensagens iguais)
- `ativo` - Ativar/desativar (obrigatório)
- `limite` - Mensagens iguais: 2-10 (opcional)
- `acao` - delete, timeout ou warn (opcional)

**`/automod antilink`** - Configurar bloqueio de links
- `ativo` - Ativar/desativar (obrigatório)
- `acao` - delete, timeout ou warn (opcional)

**`/automod badwords`** - Filtro de palavras proibidas
- `ativo` - Ativar/desativar (obrigatório)
- `palavras` - Lista separada por vírgulas (opcional)
- `acao` - delete, timeout ou warn (opcional)

**Exemplos:**
```
/automod status
/automod antispam ativo:true limite:5 intervalo:5 acao:timeout
/automod antiflood ativo:true limite:3 acao:delete
/automod antilink ativo:true acao:delete
/automod badwords ativo:true palavras:palavra1,palavra2 acao:warn
```

---

### `/logs`
Sistema de logs avançados.

**Permissão necessária:** Gerenciar Servidor

#### Subcomandos:

**`/logs setup`** - Configurar canal de logs
- `canal` - Canal para logs (obrigatório)

**`/logs toggle`** - Ativar/desativar tipo de log
- `tipo` - messages, members, moderation ou voice (obrigatório)
- `ativo` - Ativar/desativar (obrigatório)

**`/logs status`** - Ver configurações atuais

**`/logs disable`** - Desativar todos os logs

**Tipos de logs:**
- **messages** - Mensagens editadas/deletadas
- **members** - Membros entrando/saindo
- **moderation** - Ações de moderação
- **voice** - Mudanças em canais de voz

**Exemplos:**
```
/logs setup canal:#logs
/logs toggle tipo:messages ativo:true
/logs toggle tipo:moderation ativo:true
/logs status
/logs disable
```

---

### `/giveaway`
Sistema de sorteios.

**Permissão necessária:** Gerenciar Servidor

#### Subcomandos:

**`/giveaway start`** - Iniciar sorteio
- `duracao` - Duração em minutos: 1-10080 (obrigatório)
- `premio` - Prêmio do sorteio (obrigatório)
- `vencedores` - Número de vencedores: 1-20 (obrigatório)
- `canal` - Canal (opcional, padrão: atual)

**`/giveaway end`** - Finalizar sorteio antecipadamente
- `message-id` - ID da mensagem (obrigatório)

**`/giveaway reroll`** - Sortear novos vencedores
- `message-id` - ID da mensagem (obrigatório)

**`/giveaway list`** - Ver sorteios ativos

**Como participar:**
- Clique no botão "🎉 Participar" na mensagem do sorteio

**Exemplos:**
```
/giveaway start duracao:60 premio:"Nitro Classic" vencedores:1
/giveaway end message-id:123456789
/giveaway reroll message-id:123456789
/giveaway list
```

---

### `/starboard`
Sistema de mensagens destacadas.

**Permissão necessária:** Gerenciar Servidor

#### Subcomandos:

**`/starboard setup`** - Configurar canal
- `canal` - Canal para starboard (obrigatório)

**`/starboard threshold`** - Configurar mínimo de estrelas
- `quantidade` - Estrelas necessárias: 1-50 (obrigatório)

**`/starboard emoji`** - Configurar emoji
- `emoji` - Emoji para rastrear (obrigatório)

**`/starboard selfstar`** - Permitir auto-estrelas
- `permitir` - Permitir/não permitir (obrigatório)

**`/starboard toggle`** - Ativar/desativar
- `ativo` - Ativar/desativar (obrigatório)

**`/starboard status`** - Ver configurações

**`/starboard leaderboard`** - Top mensagens estreladas

**Como funciona:**
1. Configure o canal e emoji
2. Quando uma mensagem receber X estrelas (threshold), ela vai para o starboard
3. Se remover estrelas abaixo do threshold, a mensagem é removida

**Exemplos:**
```
/starboard setup canal:#starboard
/starboard threshold quantidade:3
/starboard emoji emoji:⭐
/starboard selfstar permitir:false
/starboard toggle ativo:true
/starboard status
/starboard leaderboard
```

---

### `/setlevelrole`
Configurar cargos automáticos por nível.

**Permissão necessária:** Gerenciar Cargos

#### Subcomandos:

**`/setlevelrole add`** - Adicionar cargo para um nível
- `nivel` - Nível necessário: 1-100 (obrigatório)
- `cargo` - Cargo a ser dado (obrigatório)

**`/setlevelrole remove`** - Remover cargo de um nível
- `nivel` - Nível (obrigatório)

**`/setlevelrole list`** - Ver todos os cargos configurados

**Como funciona:**
- Quando um usuário atinge o nível configurado, recebe o cargo automaticamente
- O cargo é permanente

**Exemplos:**
```
/setlevelrole add nivel:5 cargo:@Ativo
/setlevelrole add nivel:10 cargo:@Veterano
/setlevelrole add nivel:20 cargo:@Elite
/setlevelrole remove nivel:5
/setlevelrole list
```

---

### `/xpsettings`
Configurar sistema de XP.

**Permissão necessária:** Gerenciar Servidor

#### Subcomandos:

**`/xpsettings toggle`** - Ativar/desativar sistema de XP
- `ativo` - Ativar/desativar (obrigatório)

**`/xpsettings range`** - Configurar XP por mensagem
- `minimo` - XP mínimo: 1-100 (obrigatório)
- `maximo` - XP máximo: 1-100 (obrigatório)

**`/xpsettings cooldown`** - Configurar cooldown
- `segundos` - Tempo entre XP: 10-300 (obrigatório)

**`/xpsettings levelupmessage`** - Ativar/desativar mensagem de level up
- `ativo` - Ativar/desativar (obrigatório)

**`/xpsettings ignorechannel`** - Ignorar canal (não dar XP)
- `canal` - Canal para ignorar (obrigatório)

**`/xpsettings unignorechannel`** - Parar de ignorar canal
- `canal` - Canal (obrigatório)

**`/xpsettings status`** - Ver configurações atuais

**Configurações padrão:**
- XP por mensagem: 15-25
- Cooldown: 60 segundos
- Mensagem de level up: Ativada

**Exemplos:**
```
/xpsettings toggle ativo:true
/xpsettings range minimo:10 maximo:30
/xpsettings cooldown segundos:30
/xpsettings levelupmessage ativo:true
/xpsettings ignorechannel canal:#spam
/xpsettings unignorechannel canal:#spam
/xpsettings status
```

---

## 📊 Sistema de Níveis (XP)

### Como funciona:
1. Usuários ganham XP ao enviar mensagens
2. Cada mensagem dá entre 15-25 XP (configurável)
3. Cooldown de 60 segundos entre ganho de XP (configurável)
4. Ao atingir um novo nível, recebe uma mensagem de parabéns
5. Pode receber cargos automáticos configurados

### Fórmula de XP:
- **XP necessário para nível N:** `(N × 10)²`
- **Exemplos:**
  - Nível 1: 100 XP
  - Nível 5: 2.500 XP
  - Nível 10: 10.000 XP
  - Nível 20: 40.000 XP

### Comandos relacionados:
- `/rank` - Ver seu nível
- `/leaderboard` - Ver ranking
- `/xpsettings` - Configurar sistema (admin)
- `/setlevelrole` - Configurar cargos (admin)

---

## 🎁 Sistema de Economia

### Como ganhar moedas:
1. **`/daily`** - 500 moedas por dia
2. **`/work`** - 50-150 moedas a cada hora
3. **Jogos de aposta:** coinflip, dice, slots, blackjack
4. **`/rob`** - Roubar de outros usuários (arriscado)

### Como gastar moedas:
1. **`/pay`** - Transferir para outros
2. **`/shop buy`** - Comprar itens da loja
3. **Jogos de aposta** - Apostar moedas

### Dicas:
- Faça `/daily` todos os dias
- Use `/work` a cada hora
- Guarde moedas antes de apostar
- Compre itens úteis na loja
- Cuidado ao usar `/rob` - pode perder moedas!

---

## 📝 Notas Importantes

### Permissões:
- Alguns comandos requerem permissões específicas
- Comandos de moderação só funcionam com as permissões corretas
- Comandos de administração geralmente requerem "Gerenciar Servidor"

### IDs de Mensagens:
Para pegar o ID de uma mensagem:
1. Ative o Modo Desenvolvedor nas Configurações do Discord
2. Clique com botão direito na mensagem
3. Clique em "Copiar ID da Mensagem"

### Suporte:
Se encontrar algum problema:
1. Use `/fix` para problemas de música
2. Verifique as permissões do bot
3. Verifique se o bot tem acesso ao canal
4. Reporte bugs para os desenvolvedores

---

## 🔄 Atualizações

**Última atualização:** Dezembro 2024

**Total de comandos:** 45+

**Funcionalidades principais:**
- ✅ Moderação completa
- ✅ Sistema de XP e níveis
- ✅ Economia com jogos
- ✅ Sistema de música
- ✅ Auto-moderação
- ✅ Logs avançados
- ✅ Reaction Roles
- ✅ Giveaways
- ✅ Polls
- ✅ Starboard
- ✅ Shop e Inventory
- ✅ Lembretes
- ✅ E muito mais!

---

**Bot desenvolvido com Discord.js v14 + TypeScript**

Para mais informações, use `/help` no Discord!
