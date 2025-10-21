-- Enable the UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (profiles)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create chemicals table
CREATE TABLE public.chemicals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    batch_number TEXT NOT NULL UNIQUE,
    brandname TEXT NOT NULL,
    volume_per_unit NUMERIC NOT NULL,
    initial_quantity NUMERIC NOT NULL,
    current_quantity NUMERIC NOT NULL,
    expiration_date DATE NOT NULL,
    date_of_arrival DATE NOT NULL,
    safety_class TEXT NOT NULL CHECK (safety_class IN ('flammable', 'corrosive', 'reactive', 'toxic')),
    location TEXT NOT NULL,
    ghs_symbols TEXT[] NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create equipment table
CREATE TABLE public.equipment (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    serial_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('Available', 'Under Maintenance', 'Broken')),
    location TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    warranty_expiration DATE NOT NULL,
    last_maintenance DATE,
    next_maintenance DATE,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create usage logs table
CREATE TABLE public.usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    item_type TEXT NOT NULL CHECK (item_type IN ('chemical', 'equipment')),
    item_id UUID NOT NULL,
    used_quantity NUMERIC,
    remaining_quantity NUMERIC,
    location TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    target TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.users
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Chemicals policies
CREATE POLICY "Anyone can view chemicals"
    ON public.chemicals
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert chemicals"
    ON public.chemicals
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update chemicals"
    ON public.chemicals
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Equipment policies
CREATE POLICY "Anyone can view equipment"
    ON public.equipment
    FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert equipment"
    ON public.equipment
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update equipment"
    ON public.equipment
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Usage logs policies
CREATE POLICY "Users can view all usage logs"
    ON public.usage_logs
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create usage logs"
    ON public.usage_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');

-- Create functions and triggers for audit logging
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_chemicals_updated_at
    BEFORE UPDATE ON public.chemicals
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();

-- Create function to automatically create user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, username, email, role)
    VALUES (
        NEW.id,
        split_part(NEW.email, '@', 1),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to automatically create user profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();