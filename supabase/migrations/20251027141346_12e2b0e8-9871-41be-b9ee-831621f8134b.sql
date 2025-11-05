-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'patient');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create procedures table
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  benefits TEXT,
  preparation TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10,2),
  image_url TEXT,
  video_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- Procedures policies (everyone can view, only admins can modify)
CREATE POLICY "Anyone can view active procedures"
  ON public.procedures FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert procedures"
  ON public.procedures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update procedures"
  ON public.procedures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id),
  appointment_date TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Appointments policies
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Patients can create own appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    patient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample procedures
INSERT INTO public.procedures (name, description, detailed_description, benefits, preparation, duration_minutes, price, image_url, is_active) VALUES
  ('Exfoliación Corporal', 'Tratamiento de exfoliación profunda para suavizar la piel', 'Nuestra exfoliación corporal utiliza ingredientes naturales para eliminar las células muertas de la piel, promoviendo una renovación celular saludable. El tratamiento incluye una mezcla de sales marinas, aceites esenciales y extractos botánicos que nutren y revitalizan la piel.', '• Elimina células muertas
• Mejora la circulación sanguínea
• Nutre y revitaliza la piel
• Reduce la apariencia de celulitis
• Promueve una piel más suave y luminosa', 'Recomendamos no exfoliar la piel 48 horas antes del tratamiento. Evitar la exposición solar intensa y mantener una buena hidratación antes y después del procedimiento.', 60, 60.00, '/images/procedures/body-scrub.jpg', true),
  ('Facial Hidratante', 'Tratamiento facial profundo con hidratación intensiva', 'Este tratamiento facial especializado combina técnicas avanzadas de hidratación con productos de alta calidad para revitalizar y nutrir tu piel. Incluye limpieza profunda, exfoliación suave, aplicación de mascarilla hidratante y masaje facial relajante.', '• Hidratación profunda de las capas de la piel
• Reducción de líneas finas y arrugas
• Mejora el tono y textura de la piel
• Protección contra radicales libres
• Efecto rejuvenecedor natural', 'Llegar con el rostro limpio y sin maquillaje. Evitar tratamientos faciales 2 semanas antes. Informar sobre alergias o sensibilidades conocidas.', 45, 65.00, '/images/procedures/facial-hydrating.jpg', true),
  ('Tratamiento Capilar Nutritivo', 'Mascarilla intensiva para cabello seco y dañado', 'Nuestra mascarilla capilar nutritiva está formulada con ingredientes naturales como aceite de argán, keratina hidrolizada y vitaminas del complejo B para reparar y revitalizar el cabello dañado.', '• Reparación profunda del cabello dañado
• Hidratación intensiva
• Reducción del encrespamiento
• Mayor brillo y suavidad
• Fortalecimiento del cabello', 'Llegar con el cabello limpio y seco. Evitar el uso de productos capilares el día del tratamiento. Informar sobre alergias conocidas.', 50, 50.00, '/images/procedures/hair-treatment.jpg', true);