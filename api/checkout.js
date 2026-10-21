// Serverless Function para Vercel (/api/checkout)
// Integração nativa com Stripe Portugal: MB WAY, Multibanco, Cartão e Apple Pay
// Para ativar em produção na Vercel, basta definir a variável de ambiente STRIPE_SECRET_KEY.

const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Usa POST." });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return res.status(200).json({
      demoMode: true,
      message: "Modo de demonstração ativo. Define STRIPE_SECRET_KEY na Vercel para ativar pagamentos reais por MB WAY, Multibanco e Cartão."
    });
  }

  try {
    const stripe = new Stripe(stripeSecret, { apiVersion: "2026-03-25.dahlia" });
    const { items = [], customerEmail, shippingCost = 0 } = req.body;

    const line_items = items.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: `${item.title} (${item.variant || "Padrão"})`,
          images: item.image ? [item.image] : []
        },
        unit_amount: Math.round(Number(item.price) * 100)
      },
      quantity: Number(item.qty) || 1
    }));

    if (shippingCost > 0) {
      line_items.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Envio Expresso Rastreável Portugal (IOSS)"
          },
          unit_amount: Math.round(Number(shippingCost) * 100)
        },
        quantity: 1
      });
    }

    const origin = req.headers.origin || "https://www.caofrade.pt";

    const session = await stripe.checkout.sessions.create({
      ui_mode: "form",
      mode: "payment",
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: false
      },
      automatic_tax: {
        enabled: false
      },
      submit_type: "auto",
      integration_identifier: "custom_embedded_web_0001",
      line_items
    });

    return res.status(200).json({ client_secret: session.client_secret });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
