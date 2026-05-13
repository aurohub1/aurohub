import { MercadoPagoConfig, Payment, PreApproval, Preference } from 'mercadopago';

export const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });
export { Payment, PreApproval, Preference };
