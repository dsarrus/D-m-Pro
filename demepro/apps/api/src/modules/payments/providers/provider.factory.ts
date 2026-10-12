// apps/api/src/modules/payment/providers/provider.factory.ts

import type { PaymentProvider } from "../../../generated/prisma/client";

import type { PaymentProviderInterface } from "./payment-provider.interface";
import { MockProvider } from "./mock.provider";
import { OrangeMoneyProvider } from "./orange-money.provider";
import { WaveProvider } from "./wave.provider";

import { PaymentError, PaymentErrorCode } from "../errors/payment.error";

/* ================================================================
 * INSTANCES SINGLETON
 * ================================================================ */

const mockProvider = new MockProvider();
const orangeMoneyProvider = new OrangeMoneyProvider();
const waveProvider = new WaveProvider();

/* ================================================================
 * FACTORY
 * ================================================================ */

/**
 * Retourne le provider correspondant au nom fourni.
 *
 * Lance PAYMENT_PROVIDER_NOT_SUPPORTED si inconnu.
 */
export function getPaymentProvider(
  name: PaymentProvider,
): PaymentProviderInterface {
  switch (name) {
    case "MOCK":
      return mockProvider;

    case "ORANGE_MONEY":
      return orangeMoneyProvider;

    case "WAVE":
      return waveProvider;

    case "CASH_ON_DELIVERY":
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_PROVIDER_NOT_SUPPORTED,
        "Le paiement à la livraison n'est pas encore supporté.",
      );

    default: {
      const _exhaustive: never = name;
      throw new PaymentError(
        PaymentErrorCode.PAYMENT_PROVIDER_NOT_SUPPORTED,
        `Provider inconnu : ${_exhaustive}.`,
      );
    }
  }
}

/**
 * Liste des providers supportés (exposés à l'API).
 */
export function listSupportedProviders(): PaymentProvider[] {
  return ["MOCK", "ORANGE_MONEY", "WAVE"];
}