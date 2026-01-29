
-- Adiciona colunas para controle de saldo e modelo de pagamento
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_balance NUMERIC DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT FALSE; -- FALSE = Pós-pago/Cartão, TRUE = Pré-pago/Boleto

RAISE NOTICE 'Colunas current_balance e is_prepaid adicionadas em clients.';
