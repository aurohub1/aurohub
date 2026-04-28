# Skill: Formulário Cruzeiro — Regras e Binds

## Binds disponíveis (todos mapeados e funcionando)
| Bind            | Retorna                                      |
|-----------------|----------------------------------------------|
| valorint        | Parte inteira: 1.234                         |
| valdec          | Centavos com vírgula: ,56                    |
| valorparcela    | Valor completo: 1.234,56                     |
| valortotal      | Total completo: 12.345,00                    |
| cruzeiro_total  | ou R$ 12.345,00 por pessoa cabine dupla.     |
| valor_total_texto | ou R$ 12.345,00 por pessoa cabine dupla.   |
| forma_pgto      | No Cartão de Crédito Sem Juros / Entrada de R$ X + |
| parcelas        | 2x, 3x ... 25x                               |
| q_vezes         | igual parcelas                               |
| data_periodo    | 23 a 28/03                                   |
| navio           | Nome do navio                                |
| itinerario      | Portos do roteiro                            |
| incluso         | Serviços inclusos                            |

## Regras de pagamento
- Cartão → forma_pgto = "No Cartão de Crédito Sem Juros"
- Boleto/Entrada → forma_pgto = "Entrada de R$ X +"
- showEntrada = fields.formapagamento === "entrada" SEM hasBind guard

## Máscara de preço
- Digitação livre no onChange
- Formatação 0.000,00 aplicada no onBlur via applyPriceMask()
- valorint = parte inteira com ponto de milhar
- valdec = ,XX com vírgula incluída

## Templates no banco
- tmpl_base_cruzeiro_stories — template base
- tmpl_cruzeiro_stories_azul-viagens_moik2nxz — Azul Viagens
- Ambos têm elementos: valorint (fontSize 125) e valdec (fontSize 44)
