-- ==============================================================================
-- PHARMACY KHATA - COMPREHENSIVE INITIAL POSTGRESQL SCHEMA MIGRATION
-- Migration Version: 001_initial_schema.sql
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USER PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    pharmacy_business_name TEXT,
    phone_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. PHARMACIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone_number TEXT NOT NULL,
    address TEXT,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    opening_balance_type TEXT NOT NULL DEFAULT 'neutral' CHECK (opening_balance_type IN ('payable', 'receivable', 'neutral')),
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pharmacies_user_id ON public.pharmacies(user_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_name ON public.pharmacies(name);
CREATE INDEX IF NOT EXISTS idx_pharmacies_deleted_at ON public.pharmacies(deleted_at);

-- ------------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
        CREATE TYPE transaction_type_enum AS ENUM ('received', 'given');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE RESTRICT,
    invoice_number TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type transaction_type_enum NOT NULL, -- 'received' (payable) or 'given' (receivable)
    notes TEXT,
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pharmacy_id ON public.transactions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at);

-- ------------------------------------------------------------------------------
-- 4. TRANSACTION ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    retail_price NUMERIC(12, 2) NOT NULL CHECK (retail_price >= 0),
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    discounted_unit_price NUMERIC(12, 2) NOT NULL CHECK (discounted_unit_price >= 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    returned_quantity INTEGER NOT NULL DEFAULT 0 CHECK (returned_quantity >= 0 AND returned_quantity <= quantity),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_medicine_name ON public.transaction_items(medicine_name);

-- ------------------------------------------------------------------------------
-- 5. MEDICINE RETURNS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medicine_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    transaction_item_id UUID NOT NULL REFERENCES public.transaction_items(id) ON DELETE RESTRICT,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_quantity INTEGER NOT NULL CHECK (return_quantity > 0),
    original_discounted_unit_price NUMERIC(12, 2) NOT NULL CHECK (original_discounted_unit_price >= 0),
    return_amount NUMERIC(12, 2) NOT NULL CHECK (return_amount >= 0),
    reason TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_returns_user_id ON public.medicine_returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_pharmacy_id ON public.medicine_returns(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_returns_item_id ON public.medicine_returns(transaction_item_id);
CREATE INDEX IF NOT EXISTS idx_returns_date ON public.medicine_returns(return_date);

-- ------------------------------------------------------------------------------
-- 6. ACTIVITY LOGS TABLE (IMMUTABLE AUDIT TRAIL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_record ON public.activity_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. USER SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ur-ro', 'ur')),
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- user_profiles Policies
CREATE POLICY "Users can manage own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- pharmacies Policies
CREATE POLICY "Users can manage own pharmacies" ON public.pharmacies
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transactions Policies
CREATE POLICY "Users can manage own transactions" ON public.transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transaction_items Policies (joined via transaction ownership)
CREATE POLICY "Users can manage own transaction items" ON public.transaction_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaction_id AND t.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transactions t
            WHERE t.id = transaction_items.transaction_id AND t.user_id = auth.uid()
        )
    );

-- medicine_returns Policies
CREATE POLICY "Users can manage own returns" ON public.medicine_returns
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_logs Policies (Append-only: SELECT and INSERT only)
CREATE POLICY "Users can view own activity logs" ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_settings Policies
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- ATOMIC STORED PROCEDURE: PROCESS RETURN
-- Safely increments returned_quantity on transaction_items and inserts medicine_returns
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.process_medicine_return(
    p_user_id UUID,
    p_pharmacy_id UUID,
    p_transaction_id UUID,
    p_transaction_item_id UUID,
    p_return_quantity INTEGER,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_return_id UUID;
    v_return_amount NUMERIC(12, 2);
BEGIN
    -- Verify transaction and lock item row for concurrency safety
    SELECT * INTO v_item
    FROM public.transaction_items
    WHERE id = p_transaction_item_id AND transaction_id = p_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction item not found.';
    END IF;

    -- Validate quantity
    IF (v_item.returned_quantity + p_return_quantity) > v_item.quantity THEN
        RAISE EXCEPTION 'Return quantity % exceeds available returnable quantity %.',
            p_return_quantity, (v_item.quantity - v_item.returned_quantity);
    END IF;

    -- Calculate return amount: quantity * discounted_unit_price
    v_return_amount := ROUND((p_return_quantity * v_item.discounted_unit_price)::numeric, 2);

    -- Update returned quantity on item
    UPDATE public.transaction_items
    SET returned_quantity = returned_quantity + p_return_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_transaction_item_id;

    -- Insert return record
    INSERT INTO public.medicine_returns (
        user_id,
        pharmacy_id,
        transaction_id,
        transaction_item_id,
        return_quantity,
        original_discounted_unit_price,
        return_amount,
        reason
    ) VALUES (
        p_user_id,
        p_pharmacy_id,
        p_transaction_id,
        p_transaction_item_id,
        p_return_quantity,
        v_item.discounted_unit_price,
        v_return_amount,
        p_reason
    ) RETURNING id INTO v_return_id;

    -- Write to immutable audit log
    INSERT INTO public.activity_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_data,
        description
    ) VALUES (
        p_user_id,
        'CREATE',
        'medicine_returns',
        v_return_id,
        json_build_object(
            'return_id', v_return_id,
            'quantity', p_return_quantity,
            'amount', v_return_amount,
            'medicine_name', v_item.medicine_name
        ),
        'Processed return of ' || p_return_quantity || ' units of ' || v_item.medicine_name
    );

    RETURN v_return_id;
END;
$$;
