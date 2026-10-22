#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de Conteúdo e Calendário Editorial para Instagram
Cãofrade.pt — A Confraria dos Melhores Amigos
"""

import sys
import os
import re
import argparse
from datetime import datetime, timedelta

def load_catalog():
    js_path = os.path.join(os.path.dirname(__file__), "..", "js", "products.js")
    if not os.path.exists(js_path):
        js_path = os.path.join(os.getcwd(), "js", "products.js")
    
    with open(js_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Encontra os blocos de produtos através de balanceamento de chavetas
    pos = 0
    blocks = []
    while True:
        idx = content.find('id: "', pos)
        if idx == -1:
            break
        start = content.rfind("{", 0, idx)
        if start == -1:
            break
        depth = 0
        end = -1
        for i in range(start, len(content)):
            if content[i] == "{":
                depth += 1
            elif content[i] == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end != -1:
            blocks.append(content[start:end+1])
            pos = end + 1
        else:
            break

    products = []
    
    for body in blocks:
        def get_field(pattern, default=""):
            m = re.search(pattern, body)
            return m.group(1).strip() if m else default

        pid = get_field(r'id:\s*"([^"]+)"')
        title = get_field(r'title:\s*"([^"]+)"')
        subtitle = get_field(r'subtitle:\s*"([^"]+)"')
        price = get_field(r'price:\s*([0-9\.]+)', "0.00")
        category = get_field(r'category:\s*"([^"]+)"', "geral")
        short_desc = get_field(r'shortDesc:\s*"([^"]+)"')
        ad_hook = get_field(r'adHook:\s*"([^"]+)"')
        
        # Highlights
        hl_match = re.search(r'highlights:\s*\[(.*?)\]', body, re.DOTALL)
        highlights = []
        if hl_match:
            highlights = [h.strip().strip('"').strip("'") for h in hl_match.group(1).split(",") if h.strip()]

        products.append({
            "id": pid,
            "title": title,
            "subtitle": subtitle,
            "price": f"{float(price):.2f} €" if price else "N/D",
            "category": category,
            "short_desc": short_desc,
            "ad_hook": ad_hook,
            "highlights": highlights
        })
    return products

HASHTAGS_BASE = (
    "#caofrade #patudosdeportugal #caesdeportugal #gatosdeportugal "
    "#amigosdequatropatas #lojadepet #confrariapet #caofeliz #portugalpet"
)

def create_reel_script(product):
    hook = product["ad_hook"] or f"Se o teu patudo sofre com isto, precisas mesmo de ver este artigo!"
    return f"""### 🎬 REEL / TIKTOK: {product['title']}
**Duração:** 30–45 segundos  
**Áudio Sugerido:** Áudio Viral / Em tendência descontraído e dinâmico  
**Artigo:** [{product['title']}](file:///Users/frederico/Documents/site/index.html) — **{product['price']}**

#### ⏱️ Guião Cena a Cena:
- **0:00 - 0:03 (O Gancho Visual):**  
  *Texto no ecrã:* "{hook}"  
  *Cena:* Plano aproximado do problema (ex: pelos no chão / cão inquieto / sujidade) com reação do tutor com cara de espanto.
- **0:03 - 0:15 (A Agitação da Dor):**  
  *Cena:* Mostrar como as soluções tradicionais demoram imenso tempo ou não funcionam bem.
- **0:15 - 0:30 (A Revelação do Artigo Cãofrade):**  
  *Cena:* Apresentar o artigo da Cãofrade em ação direta de forma satisfatória e em câmara lenta.  
  *Destaques visuais:* {product['highlights'][0] if product['highlights'] else 'Design ergonómico e seguro'}.
- **0:30 - 0:40 (O Resultado & Patudo Feliz):**  
  *Cena:* O patudo a relaxar, limpinho e feliz.
- **0:40 - 0:45 (Chamada para Ação - CTA):**  
  *Texto no ecrã:* "Disponível na www.caofrade.pt 🐾 Cupão 10% OFF: CAOFRADE10"

---
#### 📝 Legenda Pronta a Copiar:
{hook} 👇

Na nossa Confraria sabemos bem o quanto queres o melhor para o teu companheiro de quatro patas. O **{product['title']}** foi desenhado a pensar em conveniência e bem-estar total:

✨ {product['highlights'][0] if len(product['highlights']) > 0 else 'Fácil de usar e seguro'}
✨ {product['highlights'][1] if len(product['highlights']) > 1 else 'Materiais de alta qualidade'}
✨ {product['highlights'][2] if len(product['highlights']) > 2 else 'Garantia de 14 dias'}

📦 **Portes Grátis** a partir de 39,90 € para todo o país.  
💳 Paga comodamente com **MB WAY** ou **Multibanco**.

👉 **Clica no link da nossa bio (@caofrade.pt)** e usa o cupão **CAOFRADE10** para teres 10% de desconto imediato!

{HASHTAGS_BASE} #{product['category']}
"""

def create_carousel_post(theme, product):
    return f"""### 📑 CARROSSEL EDUCATIVO: {theme}
**Objetivo:** Máximo de Partilhas e Salvamentos (Algoritmo do Instagram)  
**Artigo de Conversão Associado:** {product['title']} ({product['price']})

#### 🖼️ Estrutura de Slides:
- **Slide 1 (Capa):**  
  *Título Grande:* "3 Sinais de que o teu Patudo precisa de mais atenção a isto (O 2º quase ninguém repara) 🐾"  
  *Imagem:* Fotografia expressiva de cão ou gato a olhar curioso para a câmara.
- **Slide 2:**  
  *Título:* "1. A rotina de higiene não é só estética"  
  *Texto:* O pelo morto acumulado pode causar comichão e irritações de pele. Escovar com regularidade melhora a circulação e acalma.
- **Slide 3:**  
  *Título:* "2. O tédio diário gera ansiedade"  
  *Texto:* Patudos que passam muitas horas sozinhos precisam de estímulo mental para não roerem móveis ou ficarem apáticos.
- **Slide 4:**  
  *Título:* "3. A importância do conforto térmico"  
  *Texto:* Em dias mais frios ou húmidos, as articulações dos animais mais velhos ressentem-se se dormirem no chão frio.
- **Slide 5 (A Solução Cãofrade):**  
  *Título:* "A recomendação do Mestre Cãofrade®"  
  *Texto:* Conhece o **{product['title']}** ({product['price']}) — desenhado especificamente para resolver este desafio com conforto máximo.
- **Slide 6 (Fecho & CTA):**  
  *Texto:* "Gostaste das dicas? Salva este post 🔖 para consultar mais tarde e visita www.caofrade.pt com o código **CAOFRADE10**!"

---
#### 📝 Legenda Pronta a Copiar:
Quantas vezes olhaste para o teu companheiro e pensaste se estás a dar-lhe todo o conforto que ele merece? 🐕❤️

Desliza para o lado para veres as 3 dicas essenciais da nossa Confraria para garantir saúde e felicidade aos teus patudos em casa.

Na Cãofrade.pt selecionamos artigos inovadores e testados para facilitar o teu dia a dia e encher a tua casa de harmonia.

🎟️ Aproveita 10% de desconto com o código: **CAOFRADE10**  
🇵🇹 Encomendas com entrega em Portugal e pagamento seguro por **MB WAY** e **Multibanco**.  
🔗 Link direto no nosso perfil!

Deixa nos comentários: qual destas dicas já aplicas lá em casa? 👇

{HASHTAGS_BASE} #dicaspet #bemestaranimal
"""

def generate_monthly_plan(products):
    plan = []
    plan.append("# 📅 Plano Editorial Mensal de Instagram — Cãofrade.pt (@caofrade.pt)\n")
    plan.append("> Estratégia de 4 semanas com posts de alta conversão, Reels virais e carrosséis educativos em PT-PT.\n")
    plan.append("> Todos os artigos mencionados fazem parte do catálogo oficial da loja **www.caofrade.pt**.\n")

    weeks = [
        {"week": 1, "theme": "Higiene & Cuidados sem Stress (Adeus Pelos pela Casa)"},
        {"week": 2, "theme": "Passeio Seguro & Noites de Outono/Inverno"},
        {"week": 3, "theme": "Estímulo Mental, Brincadeira & Anti-Ansiedade"},
        {"week": 4, "theme": "Especial Conforto, Família & Preparação para o Natal"}
    ]

    p_idx = 0
    total_p = len(products)

    for w in weeks:
        plan.append(f"\n## 📆 SEMANA {w['week']}: {w['theme']}\n")
        
        # Segunda-feira: Carrossel Educativo
        p1 = products[p_idx % total_p]
        p_idx += 1
        plan.append(f"### 📌 SEGUNDA-FEIRA — Carrossel Educativo")
        plan.append(create_carousel_post(f"Como cuidar da rotina do teu patudo em casa", p1))
        
        # Quarta-feira: Reel de Produto
        p2 = products[p_idx % total_p]
        p_idx += 1
        plan.append(f"\n### 📌 QUARTA-FEIRA — Reel de Alta Conversão")
        plan.append(create_reel_script(p2))
        
        # Sexta-feira: Post de Humor / Confraria
        plan.append(f"\n### 📌 SEXTA-FEIRA — Humor & Comunidade da Confraria")
        plan.append(f"""**Formato:** Imagem Meme / POV Reel  
**Visual:** Cão ou gato com expressão hilariante no sofá  
**Texto na imagem:** "POV: São 18h de sexta-feira e o teu cão já está à espera do passeio da vitória."  
**Legenda:**  
Quem mais tem um patudo que sabe exatamente quando é sexta-feira à tarde? 😂🐾  
Marca aqui aquele amigo que troca qualquer saída à noite por uma sessão de sofá com o seu bichinho!  
Bom fim de semana de toda a equipa Cãofrade! 🐕❤️  
{HASHTAGS_BASE} #sextoucomopatudo #humorcanino
""")

        # Domingo: Stories Interativos + Oferta Especial
        p3 = products[p_idx % total_p]
        p_idx += 1
        plan.append(f"\n### 📌 DOMINGO — Sequência de Stories Interativos & Pack Oferta")
        plan.append(f"""**Sequência de 4 Stories:**
1. **Sondagem:** "O teu cão/gato costuma preferir: [A] Brinquedos interativos | [B] Dormir o dia todo"
2. **Caixa de Perguntas:** "Dúvidas sobre os artigos de {p3['category']}? Deixa aqui!"
3. **Vídeo curto:** Apresentação do **{p3['title']}** ({p3['price']}).
4. **Sticker de Link:** Link direto para www.caofrade.pt com cupão `CAOFRADE10` e selo MB WAY.
""")

    return "\n".join(plan)

def main():
    parser = argparse.ArgumentParser(description="Planeador de Instagram para Cãofrade.pt")
    parser.add_argument("--calendar", action="store_true", help="Gera o plano mensal completo em INSTAGRAM_CALENDAR.md")
    parser.add_argument("--product", type=str, help="Gera um Reel e Post para um ID de produto específico")
    parser.add_argument("--list", action="store_true", help="Lista os produtos disponíveis no catálogo")
    args = parser.parse_args()

    products = load_catalog()
    if not products:
        print("Erro: Nenhum produto encontrado em js/products.js")
        sys.exit(1)

    if args.list:
        print(f"\n🐾 Catálogo Cãofrade ({len(products)} produtos disponíveis):\n")
        for p in products:
            print(f"- {p['id']:<35} | {p['price']:<8} | {p['title']}")
        return

    if args.product:
        found = next((p for p in products if p['id'] == args.product), None)
        if not found:
            print(f"Produto '{args.product}' não encontrado. Usa --list para ver IDs válidos.")
            sys.exit(1)
        print(create_reel_script(found))
        return

    # Default / --calendar:
    plan_content = generate_monthly_plan(products)
    output_file = os.path.join(os.path.dirname(__file__), "..", "INSTAGRAM_CALENDAR.md")
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(plan_content)
    print(f"✅ Calendário Editorial gerado com sucesso em: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    main()
