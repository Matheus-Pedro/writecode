# Writecode

Treino de digitação baseado em escrita de código: você escolhe a linguagem e recebe trechos reais de código para digitar e completar, com métricas de velocidade (PPM/CPM), precisão e erros.

Linguagens: **C#**, **Python**, **JavaScript**, **C**, **TypeScript**, **Go**, **Rust**, **Ruby**, **PHP**, **Java**.

## Fontes de trechos

- **Aleatório do GitHub** — busca arquivos reais de repositórios populares da linguagem e extrai um trecho.
- **Repositório específico** — digite `owner/repo` (ex: `psf/requests`) e um arquivo aleatório é escolhido.
- **Gerado por IA** — gera um trecho sob demanda (requer `OPENAI_API_KEY`).

## Desafios de lógica

Modo de treino onde você **escreve uma função** e ela é executada no servidor contra casos de teste ocultos (passa/não passa). Acesse por **Desafios** no topo ou no botão da Home.

- 8 desafios iniciais (soma, FizzBuzz, palíndromo, Fibonacci, vogais, maior do array, primo, inverter string) nas **10 linguagens** do app.
- A execução roda em **sandbox local** (`server/src/executor.js`): o servidor compila/executa o código em diretório temporário com timeout, limite de memória virtual e sem acesso à rede.
- O servidor **detecta os runtimes instalados** no SO em que roda (node, python3, gcc, dotnet, etc.) e expõe apenas as linguagens disponíveis — não depende de serviço externo (Piston).
- Primeira resolução de um desafio concede XP (uma única vez por desafio por usuário; exige login).

### Configuração do executor local

Runtimes já presentes no Linux/WSL do projeto: **node**, **python3**, **gcc/g++**, **dotnet 9** e **TypeScript** (via `node_modules`). Para adicionar mais linguagens, instale o runtime no SO e ele passa a aparecer automaticamente:

```bash
sudo apt install -y ruby php golang default-jdk rustc   # ex.: mais linguagens
```

Limites opcionais no `server/.env`:

```bash
EXEC_RUN_TIMEOUT=8000        # ms por execução
EXEC_COMPILE_TIMEOUT=20000   # ms para compilar (C, Go, etc.)
EXEC_MEMORY_MB=512           # limite de memória virtual por processo
```

### Como adicionar um desafio

Cada desafio vive em `server/src/challenges.js`: `id`, `título`, `dificuldade`, `xp`, `summary`, `description`, `starters` (código inicial por linguagem) e `tests` (`[{ args, expected }]`). O harness por linguagem (que monta o `main` e compara os resultados) também fica nesse arquivo.

## Como rodar

```bash
npm install
npm run dev
```

- Frontend (Vite): http://localhost:5173
- Backend (Express): http://localhost:3001

Modo produção:

```bash
npm run build
npm start        # servirá o frontend buildado em http://localhost:3001
```

## Stack do frontend

- React 18 + Vite 5
- TypeScript
- Tailwind CSS (design tokens próprios: cores `ink`, accent violeta, raio/sombras customizados)
- Componentes UI próprios no estilo shadcn/ui (`class-variance-authority` + `clsx` + `tailwind-merge`)
- Framer Motion (transições de tela e micro-interações, com `prefers-reduced-motion` respeitado)
- Fontes: Inter Variable + JetBrains Mono Variable

## Configuração da IA (opcional)

Copie `server/.env.example` para `server/.env` e preencha:

```bash
OPENAI_API_KEY=sua-chave
# OPENAI_BASE_URL=https://api.openai.com/v1   (qualquer provedor compatível com a API OpenAI funciona)
# OPENAI_MODEL=gpt-4o-mini
# GITHUB_TOKEN=                               (opcional: aumenta limite de requisições do GitHub API)
```

> Nota: o projeto inclui um `.npmrc` apontando para o registry público do npm. Se o seu ambiente global usar um registry privado com token expirado, este arquivo garante que `npm install` funcione sem falhas.

## Como digitar

- Digite os caracteres na ordem; o cursor mostra a posição atual.
- `Enter` = nova linha (↩), `espaço` aparece como `·`.
- `Backspace` corrige o caractere anterior.
- Verde = correto, vermelho = errado.

## Como adicionar uma linguagem

As linguagens têm **fonte única de verdade** em `shared/languages.json` — client e server leem do mesmo arquivo. Para adicionar uma, basta um item no array:

```json
{
  "id": "elixir",
  "name": "Elixir",
  "glyph": "Ex",
  "desc": "Módulos, pipes e pattern matching",
  "extensions": ["ex", "exs"],
  "aiName": "Elixir",
  "defaults": ["elixir-lang/elixir", "phoenixframework/phoenix"]
}
```

| Campo | Função |
| --- | --- |
| `id` | Identificador usado na URL da API e no estado do app |
| `name` / `glyph` / `desc` | Texto exibido na lista da Home |
| `extensions` | Extensões de arquivo filtradas na busca do GitHub |
| `aiName` | Nome da linguagem usado no prompt de geração por IA |
| `defaults` | Repositórios usados na fonte "Aleatório do GitHub" (tenta cada um até achar arquivo) |

**O layout se adapta sozinho:** até 6 linguagens a Home usa a lista refinada de coluna única; com 7+ ela muda para grid responsivo e adiciona um campo de busca. Nada mais precisa ser tocado.

## Estrutura

```
client/  React + Vite + TypeScript + Tailwind (interface)
server/  Express (endpoints de GitHub e IA)
shared/  languages.json (fonte única de verdade das linguagens)
```
# writecode
