-- ==============================================================================
-- PHARMACY KHATA - MIGRATION 002: LOOSE PRODUCT QUANTITY & PACK SIZE
-- ==============================================================================
-- Enables loose units / tablets alongside box / pack quantities for realistic
-- Pakistani & South Asian pharmacy billing and khata exchange.

-- 1. ADD LOOSE QUANTITY & PACK SIZE TO TRANSACTION ITEMS
ALTER TABLE public.transaction_items 
  ADD COLUMN IF NOT EXISTS loose_quantity INTEGER NOT NULL DEFAULT 0 CHECK (loose_quantity >= 0),
  ADD COLUMN IF NOT EXISTS pack_size INTEGER NOT NULL DEFAULT 1 CHECK (pack_size > 0),
  ADD COLUMN IF NOT EXISTS returned_loose_quantity INTEGER NOT NULL DEFAULT 0 CHECK (returned_loose_quantity >= 0);

-- Update quantity check constraint so at least one of (quantity > 0 OR loose_quantity > 0)
ALTER TABLE public.transaction_items DROP CONSTRAINT IF EXISTS transaction_items_quantity_check;
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_quantity_check CHECK (quantity >= 0 AND (quantity > 0 OR loose_quantity > 0));

-- 2. ADD RETURN LOOSE QUANTITY TO MEDICINE RETURNS
ALTER TABLE public.medicine_returns
  ADD COLUMN IF NOT EXISTS return_loose_quantity INTEGER NOT NULL DEFAULT 0 CHECK (return_loose_quantity >= 0);

-- 3. UPDATE ATOMIC RETURN RPC FUNCTION TO SUPPORT LOOSE UNITS
CREATE OR REPLACE FUNCTION public.process_medicine_return(
    p_user_id UUID,
    p_pharmacy_id UUID,
    p_transaction_id UUID,
    p_transaction_item_id UUID,
    p_return_quantity INTEGER,
    p_return_loose_quantity INTEGER DEFAULT 0,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_return_id UUID;
    v_total_available_units INTEGER;
    v_return_total_units INTEGER;
    v_return_amount NUMERIC(12, 2);
    v_loose_unit_price NUMERIC(12, 4);
BEGIN
    -- Verify transaction and lock item row for concurrency safety
    SELECT * INTO v_item
    FROM public.transaction_items
    WHERE id = p_transaction_item_id AND transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction item not found.';
    END IF;

    -- Total units calculation
    v_total_available_units := ((v_item.quantity - v_item.returned_quantity) * v_item.pack_size) 
                             + (v_item.loose_quantity - v_item.returned_loose_quantity);
    
    v_return_total_units := (p_return_quantity * v_item.pack_size) + p_return_loose_quantity;

    IF v_return_total_units <= 0 THEN
        RAISE EXCEPTION 'Total return quantity must be greater than zero.';
    END IF;

    IF v_return_total_units > v_total_available_units THEN
        RAISE EXCEPTION 'Return total units (%) exceeds available units (%).',
            v_return_total_units, v_total_available_units;
    END IF;

    -- Price per single unit = discounted_unit_price / pack_size
    v_loose_unit_price := v_item.discounted_unit_price / v_item.pack_size;
    v_return_amount := ROUND((v_return_total_units * v_loose_unit_price)::numeric, 2);

    -- Update returned quantities on transaction item atomically
    UPDATE public.transaction_items
    SET returned_quantity = returned_quantity + p_return_quantity,
        returned_loose_quantity = returned_loose_quantity + p_return_loose_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_transaction_item_id;

    -- Record the return entry
    INSERT INTO public.medicine_returns (
        user_id,
        pharmacy_id,
        transaction_id,
        transaction_item_id,
        return_quantity,
        return_loose_quantity,
        original_discounted_unit_price,
        return_amount,
        reason
    ) VALUES (
        p_user_id,
        p_pharmacy_id,
        p_transaction_id,
        p_transaction_item_id,
        p_return_quantity,
        p_return_loose_quantity,
        v_item.discounted_unit_price,
        v_return_amount,
        p_reason
    ) RETURNING id INTO v_return_id;

    RETURN v_return_id;
END;
$$;
