#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🐾 Agente Autónomo de Publicação para Instagram — Cãofrade.pt (@caofrade.pt)
Gera conteúdos em PT-PT de alta conversão a partir do catálogo oficial e
publica diretamente via Meta Instagram Graph API ou simula em modo seguro.
"""

import sys
import os
import re
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import argparse
import ssl
from datetime import datetime

def get_ssl_context():
    """Gera um contexto SSL compatível com macOS, contornando a ausência de certificados do Python nativo."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        pass
    return ssl._create_unverified_context()

# Diretórios base
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
HISTORY_FILE = os.path.join(DATA_DIR, "instagram_history.json")
PRODUCTS_JS = os.path.join(PROJECT_ROOT, "js", "products.js")
ENV_FILE = os.path.join(PROJECT_ROOT, ".env")

# Garante a existência do diretório data
os.makedirs(DATA_DIR, exist_ok=True)


def load_env():
    """Carrega variáveis do ficheiro .env ou instagram.env se existir."""
    env_vars = {}
    candidates = [
        os.path.join(PROJECT_ROOT, ".env"),
        os.path.join(PROJECT_ROOT, "instagram.env")
    ]
    for env_path in candidates:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        env_vars[key] = val
            except Exception as e:
                print(f"⚠️ Aviso ao ler {env_path}: {e}")

    # Mescla com variáveis do sistema (sistema tem prioridade)
    for k, v in os.environ.items():
        env_vars[k] = v

    return env_vars


ENV = load_env()
INSTAGRAM_ACCOUNT_ID = ENV.get("INSTAGRAM_ACCOUNT_ID", "").strip()
INSTAGRAM_ACCESS_TOKEN = ENV.get("INSTAGRAM_ACCESS_TOKEN", "").strip()
BASE_IMAGE_URL = ENV.get("BASE_IMAGE_URL", "https://www.caofrade.pt").rstrip("/")
DRY_RUN_DEFAULT = ENV.get("DRY_RUN", "true").lower() in ("true", "1", "yes")
DISCOUNT_CODE = ENV.get("DISCOUNT_CODE", "CAOFRADE10")
BRAND_HANDLE = ENV.get("BRAND_HANDLE", "@caofrade.pt")
WEBSITE_URL = ENV.get("WEBSITE_URL", "https://www.caofrade.pt")

GRAPH_API_VERSION = "v19.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

HASHTAGS_BASE = (
    "#caofrade #patudosdeportugal #caesdeportugal #gatosdeportugal "
    "#amigosdequatropatas #lojadepet #confrariapet #caofeliz #portugalpet"
)


def load_catalog():
    """Lê e analisa os produtos a partir de js/products.js respeitando blocos aninhados."""
    if not os.path.exists(PRODUCTS_JS):
        print(f"❌ Erro: Ficheiro de produtos não encontrado em {PRODUCTS_JS}")
        return []

    with open(PRODUCTS_JS, "r", encoding="utf-8") as f:
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
        def get_str(pattern, default=""):
            m = re.search(pattern, body)
            return m.group(1).strip() if m else default

        def get_bool(pattern):
            m = re.search(pattern, body)
            return bool(m and m.group(1).lower() == "true")

        def get_num(pattern, default=0.0):
            m = re.search(pattern, body)
            try:
                return float(m.group(1)) if m else default
            except ValueError:
                return default

        pid = get_str(r'id:\s*"([^"]+)"')
        title = get_str(r'title:\s*"([^"]+)"')
        subtitle = get_str(r'subtitle:\s*"([^"]+)"')
        category = get_str(r'category:\s*"([^"]+)"', "geral")
        category_label = get_str(r'categoryLabel:\s*"([^"]+)"', "Artigos para Patudos")
        short_desc = get_str(r'shortDesc:\s*"([^"]+)"')
        price = get_num(r'price:\s*([0-9\.]+)')
        compare_at = get_num(r'compareAtPrice:\s*([0-9\.]+)')
        is_christmas = get_bool(r'isChristmas:\s*(true|false)')

        # Highlights
        hl_match = re.search(r'highlights:\s*\[(.*?)\]', body, re.DOTALL)
        highlights = []
        if hl_match:
            highlights = [h.strip().strip('"').strip("'") for h in hl_match.group(1).split(",") if h.strip()]

        # Imagens
        img_match = re.search(r'images:\s*\[(.*?)\]', body, re.DOTALL)
        images = []
        if img_match:
            images = [m.strip() for m in re.findall(r'["\']([^"\']+)["\']', img_match.group(1)) if m.strip()]

        # Ad Hook (pode estar em supplierInfo)
        ad_hook = get_str(r'adHook:\s*"([^"]+)"')

        products.append({
            "id": pid,
            "title": title,
            "subtitle": subtitle,
            "category": category,
            "category_label": category_label,
            "price": price,
            "compare_at": compare_at,
            "is_christmas": is_christmas,
            "short_desc": short_desc,
            "highlights": highlights,
            "images": images,
            "ad_hook": ad_hook
        })

    return products


def load_history():
    """Carrega o histórico de publicações do Instagram."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Erro ao ler histórico: {e}")
    return {"published_posts": []}


def save_history(history_data):
    """Guarda o histórico de publicações."""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)


def resolve_image_url(relative_or_full_url):
    """Garante que a imagem possui um URL público HTTPS acessível pela API da Meta."""
    if not relative_or_full_url:
        return ""
    if relative_or_full_url.startswith("http://") or relative_or_full_url.startswith("https://"):
        return relative_or_full_url
    cleaned = relative_or_full_url.lstrip("/")
    return f"{BASE_IMAGE_URL}/{cleaned}"


def generate_caption(product, post_type="single"):
    """
    Gera uma legenda de alta conversão em PT-PT estrito,
    seguindo as diretrizes oficiais da Cãofrade.pt.
    """
    title = product["title"]
    price_str = f"{product['price']:.2f} €".replace(".", ",")
    hook = product["ad_hook"] or f"O conforto e bem-estar que o teu patudo merece todos os dias! 🐾"

    hl1 = product["highlights"][0] if len(product["highlights"]) > 0 else "Conforto máximo e qualidade garantida"
    hl2 = product["highlights"][1] if len(product["highlights"]) > 1 else "Design ergonómico e seguro para o dia a dia"
    hl3 = product["highlights"][2] if len(product["highlights"]) > 2 else "Fácil de limpar e de longa durabilidade"

    if post_type == "carousel":
        caption = f"""{hook} Desliza para o lado para veres todos os detalhes! 🐾👉

Na Confraria dos Melhores Amigos sabemos que cada patudo merece o melhor cuidado:

✨ {hl1}
✨ {hl2}
✨ {hl3}

🏷️ Apenas {price_str} na nossa loja online.
🎟️ Usa o cupão {DISCOUNT_CODE} para teres 10% de desconto imediato!

📦 Portes Grátis para todo o país a partir de 39,90 €.
💳 Pagamentos seguros com MB WAY, Multibanco e Cartão.

🔗 Encomenda já através do link na nossa bio ({BRAND_HANDLE}) ou em {WEBSITE_URL}

Deixa um ❤️ se o teu companheiro de quatro patas merece este miminho!

{HASHTAGS_BASE} #{product['category']} #confrariapet
"""
    else:
        # Single Image Standard Post
        caption = f"""{hook} 👇

Conhece o(a) {title} — desenhado para tornar os dias do teu patudo ainda mais felizes e a tua rotina muito mais tranquila:

✨ {hl1}
✨ {hl2}
✨ {hl3}

🇵🇹 Disponível na nossa loja oficial por {price_str}!
🎁 Aplica o código {DISCOUNT_CODE} no checkout e recebe 10% de desconto.

📦 Portes Grátis a partir de 39,90 €
💳 Pagamentos fáceis por MB WAY e Multibanco

👉 Clica no link da nossa bio ({BRAND_HANDLE}) para garantir o teu!

{HASHTAGS_BASE} #{product['category']}
"""
    return caption.strip()


def select_next_product(products, history):
    """
    Seleciona o próximo produto ideal com base na sazonalidade e histórico de posts.
    """
    published_ids = [p.get("product_id") for p in history.get("published_posts", [])]

    # Prioriza produtos de Natal se estivermos em Outubro/Novembro/Dezembro
    current_month = datetime.now().month
    is_christmas_season = current_month in (10, 11, 12)

    # 1. Candidatos nunca publicados
    never_published = [p for p in products if p["id"] not in published_ids]

    if is_christmas_season:
        seasonal_candidates = [p for p in never_published if p.get("is_christmas")]
        if seasonal_candidates:
            return seasonal_candidates[0]

    if never_published:
        return never_published[0]

    # 2. Se todos já foram publicados, escolhe o publicado há mais tempo (FIFO)
    for oldest in history.get("published_posts", []):
        oldest_id = oldest.get("product_id")
        match = next((p for p in products if p["id"] == oldest_id), None)
        if match:
            return match

    return products[0]


def resolve_target_instagram_account():
    """
    Se o ID configurado for uma Página do Facebook, tenta obter automaticamente
    o ID da conta de Instagram Business associada.
    """
    if not INSTAGRAM_ACCOUNT_ID or not INSTAGRAM_ACCESS_TOKEN:
        return None, "Credenciais em falta"

    url = (
        f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}"
        f"?fields=id,name,instagram_business_account"
        f"&access_token={urllib.parse.quote(INSTAGRAM_ACCESS_TOKEN)}"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CaofradeAgent/1.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as res:
            data = json.loads(res.read().decode("utf-8"))
            if "instagram_business_account" in data:
                return data["instagram_business_account"]["id"], None
            # Pode ser já o próprio ID do Instagram
            return INSTAGRAM_ACCOUNT_ID, None
    except Exception as e:
        return INSTAGRAM_ACCOUNT_ID, str(e)


def check_instagram_status():
    """Testa a ligação com a Graph API da Meta e devolve informações detalhadas."""
    if not INSTAGRAM_ACCOUNT_ID or not INSTAGRAM_ACCESS_TOKEN:
        return {
            "success": False,
            "error": "INSTAGRAM_ACCOUNT_ID ou INSTAGRAM_ACCESS_TOKEN não definidos no .env"
        }

    # 1. Tenta consultar diretamente como conta de Instagram Business
    ig_url = (
        f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}"
        f"?fields=id,username,name,biography,followers_count,media_count"
        f"&access_token={urllib.parse.quote(INSTAGRAM_ACCESS_TOKEN)}"
    )

    try:
        req = urllib.request.Request(ig_url, headers={"User-Agent": "CaofradeAgent/1.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as response:
            ig_data = json.loads(response.read().decode("utf-8"))
            return {"success": True, "data": ig_data, "resolved_id": INSTAGRAM_ACCOUNT_ID}
    except urllib.error.HTTPError as e:
        pass
    except Exception as e:
        return {"success": False, "error": str(e)}

    # 2. Se falhou como Instagram, verifica se o ID é de uma Página de Facebook
    base_check_url = (
        f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}"
        f"?fields=id,name,instagram_business_account"
        f"&access_token={urllib.parse.quote(INSTAGRAM_ACCESS_TOKEN)}"
    )

    try:
        req = urllib.request.Request(base_check_url, headers={"User-Agent": "CaofradeAgent/1.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as response:
            node_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            msg = json.loads(err_body).get("error", {}).get("message", err_body)
        except Exception:
            msg = err_body
        return {"success": False, "error": f"HTTP {e.code}: {msg}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    # Se a Página já tem o Instagram Business Account associado
    if "instagram_business_account" in node_data:
        target_ig_id = node_data["instagram_business_account"]["id"]
        ig_url = (
            f"{GRAPH_API_BASE}/{target_ig_id}"
            f"?fields=id,username,name,biography,followers_count,media_count"
            f"&access_token={urllib.parse.quote(INSTAGRAM_ACCESS_TOKEN)}"
        )
        try:
            req = urllib.request.Request(ig_url, headers={"User-Agent": "CaofradeAgent/1.0"})
            with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as response:
                ig_data = json.loads(response.read().decode("utf-8"))
                return {"success": True, "data": ig_data, "resolved_id": target_ig_id}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # Se for Página mas sem Instagram vinculado
    page_name = node_data.get("name", "Página Facebook")
    page_id = node_data.get("id")
    return {
        "success": False,
        "is_page": True,
        "page_name": page_name,
        "page_id": page_id,
        "error": (
            f"A Página de Facebook '{page_name}' (ID: {page_id}) está autenticada com sucesso! 🎉\n"
            f"   Contudo, a conta de Instagram ainda NÃO está vinculada a esta Página no Meta Business Suite.\n"
            f"   👉 Para resolver: acede a business.facebook.com ou às Definições da Página do Facebook ➔ 'Contas Vinculadas' ➔ 'Instagram' e liga a conta @caofrade.pt."
        )
    }
    ig_url = (
        f"{GRAPH_API_BASE}/{target_ig_id}"
        f"?fields=id,username,name,biography,followers_count,media_count"
        f"&access_token={urllib.parse.quote(INSTAGRAM_ACCESS_TOKEN)}"
    )

    try:
        req = urllib.request.Request(ig_url, headers={"User-Agent": "CaofradeAgent/1.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=15) as response:
            ig_data = json.loads(response.read().decode("utf-8"))
            return {"success": True, "data": ig_data, "resolved_id": target_ig_id}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            msg = json.loads(err_body).get("error", {}).get("message", err_body)
        except Exception:
            msg = err_body
        return {"success": False, "error": f"HTTP {e.code}: {msg}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def publish_single_post(image_url, caption):
    """
    Publica um post com uma imagem no Instagram através da Instagram Graph API.
    1. Criação do container de media (POST /{ig-user-id}/media)
    2. Publicação do container (POST /{ig-user-id}/media_publish)
    """
    # Passo 1: Criar Container
    container_url = f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}/media"
    payload = {
        "image_url": image_url,
        "caption": caption,
        "access_token": INSTAGRAM_ACCESS_TOKEN
    }
    encoded_data = urllib.parse.urlencode(payload).encode("utf-8")

    try:
        req = urllib.request.Request(container_url, data=encoded_data, method="POST")
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            creation_id = res_data.get("id")
            if not creation_id:
                return {"success": False, "error": "Não foi recebido creation_id da Meta."}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return {"success": False, "error": f"Erro na criação de media: {err_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

    # Pequena pausa para a Meta descarregar e processar a imagem
    time.sleep(3)

    # Passo 2: Publicar Container
    publish_url = f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}/media_publish"
    publish_payload = {
        "creation_id": creation_id,
        "access_token": INSTAGRAM_ACCESS_TOKEN
    }
    encoded_publish = urllib.parse.urlencode(publish_payload).encode("utf-8")

    try:
        req = urllib.request.Request(publish_url, data=encoded_publish, method="POST")
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
            publish_res = json.loads(res.read().decode("utf-8"))
            published_media_id = publish_res.get("id")
            return {
                "success": True,
                "creation_id": creation_id,
                "media_id": published_media_id
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return {"success": False, "error": f"Erro na publicação: {err_body}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def publish_carousel_post(image_urls, caption):
    """
    Publica um carrossel (múltiplas imagens) no Instagram Graph API.
    """
    if len(image_urls) < 2:
        return publish_single_post(image_urls[0], caption)

    item_container_ids = []

    # Passo 1: Criar container individual para cada imagem
    for img in image_urls[:10]:  # Máximo de 10 fotos no carrossel do Instagram
        url = f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}/media"
        payload = {
            "image_url": img,
            "is_carousel_item": "true",
            "access_token": INSTAGRAM_ACCESS_TOKEN
        }
        encoded = urllib.parse.urlencode(payload).encode("utf-8")
        try:
            req = urllib.request.Request(url, data=encoded, method="POST")
            with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
                c_id = json.loads(res.read().decode("utf-8")).get("id")
                item_container_ids.append(c_id)
        except Exception as e:
            return {"success": False, "error": f"Falha ao carregar item do carrossel ({img}): {e}"}
        time.sleep(1)

    # Passo 2: Criar container pai do carrossel
    carousel_url = f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}/media"
    carousel_payload = {
        "media_type": "CAROUSEL",
        "children": ",".join(item_container_ids),
        "caption": caption,
        "access_token": INSTAGRAM_ACCESS_TOKEN
    }
    encoded_c = urllib.parse.urlencode(carousel_payload).encode("utf-8")

    try:
        req = urllib.request.Request(carousel_url, data=encoded_c, method="POST")
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
            parent_creation_id = json.loads(res.read().decode("utf-8")).get("id")
    except Exception as e:
        return {"success": False, "error": f"Falha ao criar container de carrossel: {e}"}

    time.sleep(3)

    # Passo 3: Publicar
    publish_url = f"{GRAPH_API_BASE}/{INSTAGRAM_ACCOUNT_ID}/media_publish"
    publish_payload = {
        "creation_id": parent_creation_id,
        "access_token": INSTAGRAM_ACCESS_TOKEN
    }
    encoded_pub = urllib.parse.urlencode(publish_payload).encode("utf-8")

    try:
        req = urllib.request.Request(publish_url, data=encoded_pub, method="POST")
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=30) as res:
            published_media_id = json.loads(res.read().decode("utf-8")).get("id")
            return {
                "success": True,
                "creation_id": parent_creation_id,
                "media_id": published_media_id
            }
    except Exception as e:
        return {"success": False, "error": f"Falha na publicação do carrossel: {e}"}


def execute_post(product, post_type="single", dry_run=False):
    """Gera o post e publica ou simula a execução."""
    caption = generate_caption(product, post_type=post_type)
    resolved_images = [resolve_image_url(img) for img in product["images"] if img]

    if not resolved_images:
        resolved_images = [f"{BASE_IMAGE_URL}/assets/logo-caofrade.jpg"]

    primary_image = resolved_images[0]

    print("\n" + "=" * 65)
    print(f"🐾 AGENTE INSTAGRAM CÃOFRADE — {'[SIMULAÇÃO DRY-RUN]' if dry_run else '[MODO PRODUÇÃO]'}")
    print("=" * 65)
    print(f"📦 Artigo Selecionado: {product['title']}")
    print(f"💰 Preço de Venda:    {product['price']:.2f} €")
    print(f"📸 Tipo de Post:       {post_type.upper()} ({len(resolved_images)} imagens)")
    print(f"🔗 Imagem Principal:   {primary_image}")
    print("-" * 65)
    print("📝 LEGENDA GERADA:")
    print("-" * 65)
    print(caption)
    print("=" * 65 + "\n")

    if dry_run:
        print("💡 [DRY-RUN ATIVO]: O post NÃO foi enviado para a API do Instagram.")
        print("   Para publicar de verdade, usa a flag --publish e configura as credenciais no .env\n")
        return True

    # Validação de credenciais antes de publicar
    if not INSTAGRAM_ACCOUNT_ID or not INSTAGRAM_ACCESS_TOKEN:
        print("❌ ERRO: INSTAGRAM_ACCOUNT_ID ou INSTAGRAM_ACCESS_TOKEN não estão definidos!")
        print("👉 Consulta o ficheiro INSTAGRAM_AGENT_SETUP.md para o passo a passo de configuração.")
        return False

    print("🚀 A comunicar com a Instagram Graph API da Meta...")
    if post_type == "carousel" and len(resolved_images) > 1:
        res = publish_carousel_post(resolved_images, caption)
    else:
        res = publish_single_post(primary_image, caption)

    if res.get("success"):
        media_id = res.get("media_id")
        print(f"🎉 SUCESSO! Post publicado no Instagram com o ID de media: {media_id}")

        # Gravar no histórico
        history = load_history()
        history["published_posts"].append({
            "product_id": product["id"],
            "title": product["title"],
            "published_at": datetime.now().isoformat(),
            "media_id": media_id,
            "post_type": post_type,
            "image_url": primary_image
        })
        save_history(history)
        print(f"💾 Histórico atualizado em {HISTORY_FILE}")
        return True
    else:
        print(f"❌ Falha ao publicar no Instagram: {res.get('error')}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="🐾 Agente Autónomo de Publicação de Instagram para Cãofrade.pt"
    )
    parser.add_argument("--preview", action="store_true", help="Gera o próximo post e exibe no terminal sem publicar")
    parser.add_argument("--dry-run", action="store_true", help="Executa simulação sem comunicar com o Instagram")
    parser.add_argument("--publish", action="store_true", help="Publica o post selecionado diretamente no Instagram")
    parser.add_argument("--publish-next", action="store_true", help="Seleciona o próximo artigo da rotação e publica")
    parser.add_argument("--product", type=str, help="ID específico do produto em js/products.js")
    parser.add_argument("--type", choices=["single", "carousel"], default="single", help="Tipo de post (single ou carousel)")
    parser.add_argument("--status", action="store_true", help="Verifica a validade do token e conexão com o Instagram")
    parser.add_argument("--list", action="store_true", help="Lista todos os produtos disponíveis e status de publicação")
    parser.add_argument("--daemon", type=int, nargs="?", const=24, help="Executa de forma autónoma a cada N horas")

    args = parser.parse_args()

    # 1. Status Check
    if args.status:
        print("\n🔍 A verificar credenciais e conexão com o Instagram Graph API...")
        status = check_instagram_status()
        if status.get("success"):
            acc = status["data"]
            print(f"✅ Conexão estabelecida com sucesso!")
            print(f"   👤 Utilizador: @{acc.get('username')}")
            print(f"   📛 Nome:       {acc.get('name')}")
            print(f"   🆔 ID Conta:   {acc.get('id')}")
            print(f"   👥 Seguidores: {acc.get('followers_count', 'N/D')}")
            print(f"   📝 Bio:        {acc.get('biography', '')[:80]}...\n")
        else:
            print(f"❌ Falha na conexão com a Meta: {status.get('error')}")
            print("👉 Segue as instruções de configuração em INSTAGRAM_AGENT_SETUP.md\n")
        return

    # Carrega Catálogo e Histórico
    products = load_catalog()
    if not products:
        sys.exit(1)

    history = load_history()

    # 2. List Catalog
    if args.list:
        published_ids = {p["product_id"]: p["published_at"] for p in history.get("published_posts", [])}
        print(f"\n🐾 Catálogo Cãofrade.pt ({len(products)} produtos):\n")
        for p in products:
            pub_status = f"✅ Publicado ({published_ids[p['id']][:10]})" if p['id'] in published_ids else "⏳ Por publicar"
            print(f"- {p['id']:<35} | {p['price']:>6.2f} € | {pub_status} | {p['title']}")
        print(f"\nTotal publicados no histórico: {len(published_ids)}/{len(products)}\n")
        return

    # Determina o produto a processar
    target_product = None
    if args.product:
        target_product = next((p for p in products if p["id"] == args.product), None)
        if not target_product:
            print(f"❌ Produto com ID '{args.product}' não encontrado. Usa --list para ver IDs válidos.")
            sys.exit(1)
    else:
        target_product = select_next_product(products, history)

    # Modo Autónomo (Daemon)
    if args.daemon:
        interval_secs = args.daemon * 3600
        print(f"🤖 Agente iniciado em modo autónomo contínuo (intervalo: {args.daemon}h)...")
        while True:
            history = load_history()
            p = select_next_product(products, history)
            print(f"\n⏰ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] A executar publicação agendada...")
            is_dry = DRY_RUN_DEFAULT and not args.publish
            execute_post(p, post_type=args.type, dry_run=is_dry)
            print(f"💤 A aguardar {args.daemon} horas até à próxima publicação...")
            time.sleep(interval_secs)

    # Determina se é simulação
    is_dry_run = args.preview or args.dry_run or (not args.publish and not args.publish_next) or DRY_RUN_DEFAULT

    if args.publish or args.publish_next:
        # Se o utilizador explicitamente pediu --publish ou --publish-next e tem token, desativa dry-run
        if INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN:
            is_dry_run = False
        else:
            print("⚠️ Nota: Credenciais ainda não configuradas. A correr em modo de simulação (preview).")
            is_dry_run = True

    execute_post(target_product, post_type=args.type, dry_run=is_dry_run)


if __name__ == "__main__":
    main()
