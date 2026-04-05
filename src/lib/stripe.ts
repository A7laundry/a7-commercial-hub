import Stripe from "stripe"

// Lazy singleton — only instantiated on first actual use (not at build time)
let _client: Stripe | undefined

export function getStripe(): Stripe {
  if (!_client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    _client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    })
  }
  return _client
}
