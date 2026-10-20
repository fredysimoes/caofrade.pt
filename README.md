# 🐾 Cãofrade.pt — Loja Online de Dropshipping Pet (Portugal)

Bem-vindo ao repositório oficial da loja **`www.caofrade.pt`**.

## 🚀 Como testar a loja localmente no teu Mac

Basta executar na pasta `/Users/frederico/Documents/site`:

```bash
python3 -m http.server 3000
```

E abrir no navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 🌐 Como publicar gratuitamente na Vercel e ligar o domínio `www.caofrade.pt`

1. Cria uma conta gratuita em [vercel.com](https://vercel.com/) e importa esta pasta (via GitHub ou Vercel CLI).
2. Na Vercel, vai a **Settings → Domains** e adiciona `www.caofrade.pt` e `caofrade.pt`.
3. No painel onde compraste o domínio `.pt` (ex: Amen.pt, Dominios.pt, GoDaddy, Namecheap), configura os seguintes registos DNS:
   - **Tipo `A`** | Nome: `@` | Valor: `76.76.21.21`
   - **Tipo `CNAME`** | Nome: `www` | Valor: `cname.vercel-dns.com`
4. O certificado SSL (`https://www.caofrade.pt`) é ativado automaticamente e sem custos pela Vercel em poucos minutos.

---

## 💳 Como ativar pagamentos reais por MB WAY, Multibanco e Cartão

1. Cria uma conta gratuita em [stripe.com/pt](https://stripe.com/pt).
2. No painel da Stripe, ativa os métodos de pagamento **MB WAY** e **Multibanco** em *Settings → Payment Methods*.
3. Copia a tua chave secreta (`sk_live_...`) e adiciona-a nas variáveis de ambiente do projeto na Vercel com o nome `STRIPE_SECRET_KEY`.
4. O endpoint `/api/checkout.js` já está preparado para processar pagamentos em Euros (`EUR`) com MB WAY, Multibanco, Visa, Mastercard e Apple Pay.

---

## 📦 Como processar encomendas no DSers / AliExpress ou Zendrop

1. Na loja, clica no botão **"📊 Painel Dropshipping"** no topo direito.
2. Consulta a tabela de encomendas recebidas e clica em **"⬇️ Exportar Encomendas CSV (DSers / Zendrop)"** para importar diretamente as moradas portuguesas no DSers ou Zendrop, ou clica nos links diretos de cada produto para aceder ao fornecedor.
