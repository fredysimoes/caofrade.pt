# 🐾 Guia de Configuração do Agente Autónomo de Instagram — Cãofrade.pt

Este documento detalha o processo completo de configuração, autenticação e execução autónoma do agente de publicação para o Instagram oficial da **Cãofrade.pt** (`@caofrade.pt`).

---

## 🏗️ 1. Como Funciona a Publicação Autónoma no Instagram

A Meta (empresa detentora do Instagram e Facebook) disponibiliza a **Instagram Graph API (Content Publishing API)**. Esta é a via oficial, 100% segura e aprovada pela Meta para agendar e publicar posts, carrosséis e reels de forma programática sem risco de bloqueio de conta.

```
┌─────────────────────────────────┐
│     Catálogo Cãofrade.pt       │
│      (js/products.js)           │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│    Agente de Copywriting        │ ◄── Regras PT-PT (.agents/rules/instagram.md)
│   (scripts/instagram_agent.py)  │ ◄── Matriz Editorial (.agents/skills/instagram-caofrade)
└───────────────┬─────────────────┘
                │ Gera legenda com cupão CAOFRADE10,
                │ portes grátis, MB WAY e seleciona imagem HTTPS
                ▼
┌─────────────────────────────────┐
│   Meta Instagram Graph API      │
│   POST /{account-id}/media      │ ──► Criação do Content Container
│   POST /{account-id}/publish    │ ──► Publicação Oficial no Feed
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Histórico & Prevenção de Dups │
│  (data/instagram_history.json)  │
└─────────────────────────────────┘
```

---

## 🔑 2. Passo a Passo: Configuração na Meta (Facebook / Instagram)

### Pré-requisitos Obrigatórios:
1. Uma conta de Instagram para a Cãofrade configurada como **Conta Profissional (Empresarial ou Criador)**.
2. Uma **Página de Facebook** ligada à conta de Instagram (obrigatório pela Meta para acesso via API).

---

### Passo 1: Criar uma Aplicação no Meta for Developers
1. Acede a [developers.facebook.com](https://developers.facebook.com/) e inicia sessão com a tua conta do Facebook que administra a página da Cãofrade.
2. Clica em **"Os meus aplicativos"** (My Apps) ➔ **"Criar aplicativo"** (Create App).
3. Seleciona o tipo de aplicativo: **"Outro"** (Other) ou **"Empresa"** (Business) e avança.
4. Dá o nome à aplicação (ex: `Caofrade Instagram Publisher`) e associa a tua conta empresarial.

---

### Passo 2: Adicionar o produto "Instagram Graph API"
1. No painel da aplicação recém-criada, localiza o cartão **Instagram Graph API** e clica em **Configurar** (Set Up).
2. As permissões necessárias para publicação autónoma são:
   - `instagram_basic` (Leitura do perfil e ID da conta)
   - `instagram_content_publish` (Permite publicar fotos e carrosséis no feed)
   - `pages_show_list` (Listar as páginas geridas)
   - `pages_read_engagement` (Leitura de métricas e status)

---

### Passo 3: Obter o `INSTAGRAM_ACCOUNT_ID` e o Access Token
1. No menu superior da consola Meta, vai a **Ferramentas (Tools)** ➔ **Explorador da API Graph** (Graph API Explorer).
2. Seleciona a tua aplicação no menu pendente.
3. Em **Permissões de Usuário ou Página**, adiciona as 4 permissões acima e clica em **Generate Access Token**.
4. Aceita os diálogos do Facebook ligando a tua Página e a conta de Instagram `@caofrade.pt`.
5. No campo da consulta GET do explorador, executa:
   ```http
   GET me/accounts?fields=instagram_business_account,name
   ```
   A resposta JSON devolverá algo como:
   ```json
   {
     "data": [
       {
         "name": "Cãofrade",
         "instagram_business_account": {
           "id": "17841400000000000"
         },
         "id": "100000000000000"
       }
     ]
   }
   ```
   👉 O número dentro de `instagram_business_account.id` é o teu **`INSTAGRAM_ACCOUNT_ID`**!

---

### Passo 4: Gerar um Token de Longa Duração (60 dias ou Permanente)
Por padrão, os tokens temporários expiram em poucas horas. Para automação:
1. No Graph API Explorer, clica no ícone de informação ℹ️ junto ao token e clica em **"Abrir na ferramenta de token de acesso"** (Access Token Tool).
2. Clica no botão **"Estender Token de Acesso"** (Extend Access Token) para obter um token válido por **60 dias**.
3. *(Opcional / Recomendado para Produção)*: No Meta Business Suite, podes criar um **Usuário do Sistema (System User)** com a função Administrador e gerar um token sem data de expiração (Token Permanente).

---

## ⚙️ 3. Configuração Local no Projeto

1. Na raiz do projeto (`/Users/frederico/Documents/site`), copia o ficheiro de exemplo para `.env`:
   ```bash
   cp .env.instagram.example .env
   ```
2. Abre o ficheiro `.env` e preenche:
   ```env
   INSTAGRAM_ACCOUNT_ID=17841400000000000
   INSTAGRAM_ACCESS_TOKEN=EAAG...oTeuTokenAqui...
   BASE_IMAGE_URL=https://www.caofrade.pt
   DRY_RUN=false
   ```

> 🔒 **Segurança**: O ficheiro `.env` nunca deve ser partilhado publicamente. Certifica-te de que está listado no `.gitignore`.

---

## 🚀 4. Como Usar o Agente (`scripts/instagram_agent.py`)

O agente possui vários comandos úteis para operação manual ou 100% automatizada:

### A) Testar Conexão com o Instagram
Verifica se as tuas credenciais estão ativas e se a API reconhece a conta da Cãofrade:
```bash
python3 scripts/instagram_agent.py --status
```

### B) Pré-visualização Segura (Sem Publicar)
Gera uma proposta de post para o próximo artigo da rotação ou para um produto específico:
```bash
# Ver rascunho do próximo post da fila
python3 scripts/instagram_agent.py --preview

# Ver rascunho para um produto específico
python3 scripts/instagram_agent.py --product camisola-natal-rena-capuz --preview
```

### C) Publicar Imediatamente
```bash
# Publica o próximo artigo recomendado pelo algoritmo de rotação
python3 scripts/instagram_agent.py --publish-next

# Publica um produto específico
python3 scripts/instagram_agent.py --product coleira-laco-natal-guizo --publish
```

### D) Publicar Carrossel Educativo ou com Múltiplas Fotos
```bash
python3 scripts/instagram_agent.py --product manta-polar-cozypaws --type carousel --publish
```

---

## 🤖 5. Automação Periódica (Publicar Sozinho Todos os Dias)

Para que o agente publique de forma totalmente autónoma sem intervenção humana:

### Opção 1: GitHub Actions (Totalmente na Cloud, Grátis e Sem Precisar do Mac Ligado)
O ficheiro modelo de workflow está disponível em `scripts/workflows/instagram_autopost.yml`.
(Se quiseres ativá-lo diretamente no GitHub, basta colocá-lo na pasta `.github/workflows/` através da interface web do GitHub ou usando um token com a permissão `workflow`).
Basta adicionares aos **Settings ➔ Secrets and variables ➔ Actions** do teu repositório GitHub:
- `INSTAGRAM_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`

O GitHub irá correr o agente todos os dias às **18:30 (horário de Lisboa)**, publicar o post no Instagram e registar o histórico no repositório.

### Opção 2: Cron Job no Mac
Se preferires correr localmente no teu Mac:
```bash
crontab -e
```
Adiciona a seguinte linha (exemplo para correr todos os dias às 18:30):
```cron
30 18 * * * cd /Users/frederico/Documents/site && /usr/bin/python3 scripts/instagram_agent.py --publish-next >> logs/instagram.log 2>&1
```

### Opção 3: Agente Nativo Antigravity
Podes pedir diretamente ao assistente:
> *"Publica o próximo post no Instagram da Cãofrade"*  
> ou  
> *"Verifica o status da conta de Instagram e gera o rascunho de hoje"*

O subagente especializado `instagram-publisher` executará as ações de geração e publicação.

---

## 📋 6. Regras de Estilo e Conversão Aplicadas

O agente segue estritamente as diretrizes da marca Cãofrade:
- **Português de Portugal (PT-PT)**: termos como *patudos*, *tutores*, *trela*, *encomenda*, *portes grátis*, sem regionalismos PT-BR.
- **Chamada para Ação (CTA)**:
  - Cupão de desconto ativo: `CAOFRADE10` (-10%).
  - Portes grátis a partir de 39,90 €.
  - Métodos de pagamento portugueses de confiança: **MB WAY** e **Multibanco**.
  - Link na Bio: `www.caofrade.pt`.
- **Hashtags Estratégicas**: Seleção ponderada de tags de nicho (`#caesdeportugal`, `#gatosdeportugal`, `#caofrade`, `#confrariapet`).
