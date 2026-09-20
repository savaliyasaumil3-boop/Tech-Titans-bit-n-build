ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS vehicle_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS VARCHAR(64)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT driver_id
  FROM public.profiles
  WHERE id = auth.uid() AND role = 'driver'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    driver_id,
    vehicle_id,
    phone,
    is_active,
    must_change_password,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', '') IN ('supervisor', 'driver') THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'driver'
    END,
    NEW.raw_user_meta_data ->> 'full_name',
    NULLIF(NEW.raw_user_meta_data ->> 'driver_id', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'vehicle_id', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'is_active')::boolean, TRUE),
    COALESCE((NEW.raw_user_meta_data ->> 'must_change_password')::boolean, FALSE),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    driver_id = COALESCE(EXCLUDED.driver_id, public.profiles.driver_id),
    vehicle_id = COALESCE(EXCLUDED.vehicle_id, public.profiles.vehicle_id),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    is_active = EXCLUDED.is_active,
    must_change_password = EXCLUDED.must_change_password,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_create_profile ON auth.users;
CREATE TRIGGER on_auth_user_create_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.profiles (id, role, full_name, driver_id, vehicle_id, phone, is_active, must_change_password, created_at, updated_at)
SELECT
  au.id,
  CASE
    WHEN COALESCE(au.raw_user_meta_data ->> 'role', '') IN ('supervisor', 'driver') THEN au.raw_user_meta_data ->> 'role'
    ELSE 'driver'
  END,
  au.raw_user_meta_data ->> 'full_name',
  NULLIF(au.raw_user_meta_data ->> 'driver_id', ''),
  NULLIF(au.raw_user_meta_data ->> 'vehicle_id', ''),
  NULLIF(au.raw_user_meta_data ->> 'phone', ''),
  COALESCE((au.raw_user_meta_data ->> 'is_active')::boolean, TRUE),
  COALESCE((au.raw_user_meta_data ->> 'must_change_password')::boolean, FALSE),
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
