import { z } from "zod";

const campoSchema = z.number().min(0, "Mínimo 0").max(60, "Máximo 60 por indicador");

const basePesos = z.object({
  dy_atual:            campoSchema,
  dy_12m:              campoSchema,
  p_vp:                campoSchema,
  vacancia_fisica:     campoSchema,
  vacancia_financeira: campoSchema,
  liquidez_diaria:     campoSchema,
  volatilidade_12m:    campoSchema,
  patrimonio_liquido:  campoSchema,
  num_cotistas:        campoSchema,
  segmento:            campoSchema,
});

export const pesosSchema = basePesos.superRefine((data, ctx) => {
  const soma = Object.values(data).reduce((acc, v) => acc + v, 0);
  if (Math.abs(soma - 100) > 0.01) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `A soma dos pesos deve ser 100 (atual: ${soma})`,
      path: ["_soma"],
    });
  }
});

export type PesosForm = z.infer<typeof basePesos>;
export type PesosValidados = z.infer<typeof pesosSchema>;

export const somaSchema = basePesos.transform((data) =>
  Object.values(data).reduce((acc, v) => acc + v, 0)
);
