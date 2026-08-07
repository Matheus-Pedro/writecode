export const CATEGORY_LABELS = {
  java: "Java",
  python: "Python",
  sql: "SQL",
  git: "Git",
  docker: "Docker",
  web: "HTML/CSS",
  general: "Conceitos Gerais",
};

export const MAX_ATTEMPTS = 6;

function word(w, category, hints, explanation) {
  return { w, category, hints, explanation };
}

const WORDS_BY_CATEGORY = {
  java: [
    word("public", "java", [
      "Palavra reservada do Java.",
      "Controla o acesso de classes e métodos.",
      "Vem antes de quase toda classe."
    ], "Modificador de acesso que torna uma classe, método ou campo acessível a partir de qualquer lugar."),
    word("static", "java", [
      "Marca algo que pertence à classe.",
      "Não precisa de uma instância.",
      "É usado no método main."
    ],
    "Modificador que faz um membro pertencer à classe, sem precisar de uma instância."),
    word("class", "java", [
      "Define um molde de objetos.",
      "Onde ficam métodos e campos.",
      "Todo arquivo .java tem um."
    ],
    "Palavra-chave usada para declarar uma classe, o bloco que agrupa estado e comportamento."),
    word("import", "java", [
      "Traduz de outro pacote.",
      "Fica no topo do arquivo.",
      "Traz bibliotecas para o código."
    ],
    "Instrução que torna classes de outros pacotes disponíveis no código atual."),
    word("extends", "java", [
      "Usada em herança.",
      "Relaciona uma classe a outra.",
      "vem depois de { } do nome da interface."
    ],
    "Palavra-chave que indica que uma classe herda de outra classe."),
    word("void", "java", [
      "Tipo de retorno.",
      "Não devolve valor.",
      "Aparece em métodos sem resultado."
    ],
    "Tipo de retorno que indica que um método não devolve nenhum valor."),
  ],
  python: [
    word("def", "python", [
      "Declaração de função.",
      "Palavra curta e central.",
      "Vem antes do nome da função."
    ],
    "Palavra-chave usada para declarar uma função (define)."),
    word("class", "python", [
      "Define um molde para objetos.",
      "A partir dela se criam instâncias.",
      "Agrupa métodos e atributos."
    ],
    "Palavra-chave para declarar uma classe em Python."),
    word("return", "python", [
      "Devolve um valor.",
      "Encerra a execução da função.",
      "A função flui por aqui."
    ],
    "Instrução que finaliza uma função e devolve um valor ao chamador."),
    word("lambda", "python", [
      "Cria função anônima.",
      "Cabe em uma única linha.",
      "Muito usado com map/filter."
    ],
    "Palavra-chave que cria funções anônimas de forma compacta."),
    word("import", "python", [
      "Traz módulos para o arquivo.",
      "Fica no início.",
      "Ex: import os."
    ],
    "Declara módulos e pacotes disponíveis no código."),
    word("while", "python", [
      "Repete algo várias vezes.",
      "Parece com uma língua.",
      "Condicional de loop."
    ],
    "Estrutura que repete um bloco enquanto uma condição for verdadeira."),
  ],
  sql: [
    word("select", "sql", [
      "Consulta dados de uma tabela.",
      "Principal comando de leitura.",
      "quase toda query começa com ele."
    ],
    "Comando SQL que recupera dados de uma tabela."),
    word("where", "sql", [
      "Filtra as linhas.",
      "Vem depois do from.",
      "Aplicada a condição de filtro."
    ],
    "Cláusula SQL que filtra registros conforme uma condição."),
    word("table", "sql", [
      "Estrutura que guarda dados.",
      "Linhas e colunas.",
      "`CREATE TABLE` a cria."
    ],
    "Estrutura de dados relacional organizada em linhas e colunas."),
    word("insert", "sql", [
      "Adiciona dados.",
      "Começa com I.",
      "Cria novas linhas."
    ],
    "Comando SQL que insere novas linhas em uma tabela."),
    word("order", "sql", [
      "Ordena resultado.",
      "Usado como ORDER BY.",
      "ascende ou desce."
    ],
    "Parte da cláusula ORDER BY que ordena o resultado da consulta."),
  ],
  git: [
    word("commit", "git", [
      "Snapshot de mudanças.",
      "Primeiro comando visto.",
      "Registra o estado do código."
    ],
    "Comando que registra um ponto do histórico com as mudanças feitas."),
    word("merge", "git", [
      "Une duas branches.",
      "Integra históricos.",
      "Juntado no git."
    ],
    "Comando que integra as alterações de uma branch em outra."),
    word("branch", "git", [
      "Linha de desenvolvimento.",
      "Permite trabalhar em paralelo.",
      "`git branch nova` a cria."
    ],
    "Linha independente de desenvolvimento dentro do repositório."),
    word("clone", "git", [
      "Copia um repositório.",
      "Traz projeto remotamente.",
      "`git clone url`."
    ],
    "Comando para copiar um repositório remoto para o ambiente local."),
  ],
  docker: [
    word("build", "docker", [
      "Gera uma imagem.",
      "Instrução no Dockerfile.",
      "`docker build`."
    ],
    "Comando que constrói uma imagem a partir de um Dockerfile."),
    word("image", "docker", [
      "Pacote imutável.",
      "Serve à base de containers.",
      "Resultado do build."
    ],
    "Pacote executável que contém tudo o que um container precisa para rodar."),
    word("pull", "docker", [
      "Baixa uma imagem.",
      "Vem de um registro.",
      "`docker pull imagem`."
    ],
    "Comando que baixa uma imagem do registro Docker."),
    word("ports", "docker", [
      "Exposição de rede.",
      "Configuração no docker run.",
      "Mapeia host:container."
    ],
    "Configuração que mapeia portas do container para o host."),
  ],
  web: [
    word("flex", "web", [
      "Modelo de layout CSS.",
      "Organiza itens em uma linha.",
      "`display` usa isso."
    ],
    "Sistema de layout CSS 'flexbox' que distribui itens em uma direção."),
    word("margin", "web", [
      "Espaçamento externo.",
      "A cerda do elemento.",
      "`margin: 0 auto` centraliza."
    ],
    "Propriedade CSS para o espaçamento externo de um elemento."),
    word("header", "web", [
      "Elemento de topo.",
      "Cabeçalho de página.",
      "Semântico do HTML."
    ],
    "Elemento HTML semântico que representa o cabeçalho de uma página ou seção."),
    word("class", "web", [
      "Seletores de estilos.",
      "Reutilizável em vários elementos.",
      "Nomes separados por ponto no CSS."
    ],
    "Atributo HTML que permite aplicar estilos em vários elementos."),
  ],
  general: [
    word("variable", "general", [
      "Guarda um valor.",
      "Nome dado ao dado.",
      "Pode mudar de valor."
    ],
    "Nome que referencia um valor que pode mudar durante a execução."),
    word("function", "general", [
      "Bloco reutilizável.",
      "Recebe entradas e processa.",
      "Devolve um resultado."
    ],
    "Bloco nomeado de código que executa uma tarefa e pode retornar resultado."),
    word("compile", "general", [
      "Converte fonte em máquina.",
      "Fase de build.",
      "Transforma e valida o código."
    ],
    "Processo de transformar código-fonte em binário/bits executáveis."),
    word("loop", "general", [
      "Repete um trecho.",
      "Executa até condição.",
      "for / while."
    ],
    "Estrutura que repete um bloco de código enquanto uma condição vigora."),
    word("null", "general", [
      "Representa ausência.",
      "Nenhum valor.",
      "Muito comum em ponteiros."
    ],
    "Valor especial que indica ausência de referência ou valor de um dado."),
    word("stack", "general", [
      "Estrutura de dados.",
      "LIFO.",
      "Empilha/desempilha."
    ],
    "Estrutura de dados do tipo LIFO (último a entrar, primeiro a sair)."),
  ],
};

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

export function wordForTheDay(date = new Date()) {
  const dow = date.getDay();
  const category =
    dow === 1 ? "java" :
    dow === 2 ? "python" :
    dow === 3 ? "sql" :
    dow === 4 ? "git" :
    dow === 5 ? "docker" :
    dow === 6 ? "web" :
    "general";
  const pool = WORDS_BY_CATEGORY[category];
  const idx = dayOfYear(date) % pool.length;
  const item = pool[idx];
  return { ...item, categoryLabel: CATEGORY_LABELS[category] };
}

export function randomWord() {
  const pool = Object.values(WORDS_BY_CATEGORY).flat();
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { ...item, categoryLabel: CATEGORY_LABELS[item.category] };
}

export function letterFeedback(guess, solution) {
  const target = solution.toLowerCase();
  const g = guess.toLowerCase();
  const res = new Array(g.length).fill("absent");
  const used = new Array(target.length).fill(false);
  for (let i = 0; i < g.length; i++) {
    if (g[i] === target[i]) {
      res[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (res[i] === "correct") continue;
    for (let j = 0; j < target.length; j++) {
      if (!used[j] && target[j] === g[i]) {
        res[i] = "present";
        used[j] = true;
        break;
      }
    }
  }
  return res;
}

export function hintsFor(attemptsUsed) {
  if (attemptsUsed >= 6) return 3;
  if (attemptsUsed >= 5) return 2;
  if (attemptsUsed >= 3) return 1;
  return 0;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// solves: array of { day, solved, attempts, duration }
export function computeStats(solves) {
  const solved = solves.filter((s) => Number(s.solved) === 1);
  const totalPlayed = solves.length;
  const totalSolved = solved.length;
  const accuracy = totalPlayed > 0 ? totalSolved / totalPlayed : 0;
  const avgAttempts = solved.length > 0 ? solved.reduce((a, s) => a + Number(s.attempts), 0) / solved.length : 0;
  const withTime = solved.filter((s) => s.duration != null && Number(s.duration) > 0);
  const avgTime = withTime.length > 0 ? withTime.reduce((a, s) => a + Number(s.duration), 0) / withTime.length : 0;

  let currentStreak = 0;
  let today = dayKey();
  if (!solves.some((s) => s.day === today && Number(s.solved) === 1)) {
    today = addDays(today, -1);
  }
  const byDay = new Map(solves.map((s) => [s.day, Number(s.solved) === 1]));
  while (byDay.get(today)) {
    currentStreak++;
    today = addDays(today, -1);
  }

  let bestStreak = 0;
  let run = 0;
  const allSorted = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (const [, ok] of allSorted) {
    run = ok ? run + 1 : 0;
    if (run > bestStreak) bestStreak = run;
  }

  return { currentStreak, bestStreak, totalSolved, totalPlayed, accuracy, avgAttempts, avgTime };
}