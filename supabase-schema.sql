-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'guru', 'tenaga_kependidikan');
CREATE TYPE attendance_status AS ENUM ('hadir', 'izin', 'sakit', 'alpa');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'guru',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create classes table
CREATE TABLE classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create students table
CREATE TABLE students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nis TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create attendance_staff table
CREATE TABLE attendance_staff (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME,
  status attendance_status NOT NULL DEFAULT 'hadir',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create attendance_students table
CREATE TABLE attendance_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'hadir',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, date)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_students ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles: Everyone can read profiles, only admins can insert/update/delete
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Profiles can be inserted by admins" ON profiles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Profiles can be updated by admins" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Profiles can be deleted by admins" ON profiles FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Classes: Everyone can read, only admins can modify
CREATE POLICY "Classes are viewable by authenticated users" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Classes can be inserted by admins" ON classes FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Classes can be updated by admins" ON classes FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Classes can be deleted by admins" ON classes FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Students: Everyone can read, only admins can modify
CREATE POLICY "Students are viewable by authenticated users" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Students can be inserted by admins" ON students FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can be updated by admins" ON students FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can be deleted by admins" ON students FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Attendance Staff: Users can read all staff attendance
-- Users can only insert/update their own attendance.
CREATE POLICY "Staff attendance viewable by authenticated users" ON attendance_staff FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Staff can insert their own attendance" ON attendance_staff FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can update their own attendance" ON attendance_staff FOR UPDATE USING (auth.uid() = user_id);

-- Attendance Students: Admins and Guru can read and modify.
CREATE POLICY "Student attendance viewable by authenticated users" ON attendance_students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Student attendance insertable by admin and guru" ON attendance_students FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru')));
CREATE POLICY "Student attendance updatable by admin and guru" ON attendance_students FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru')));
CREATE POLICY "Student attendance deletable by admin and guru" ON attendance_students FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'guru')));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'guru'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Insert Mock Data for Students (Optional)
INSERT INTO students (nis, name, class_name) VALUES
  ('1001', 'Ahmad Fauzi', 'XII RPL 1'),
  ('1002', 'Budi Santoso', 'XII RPL 1'),
  ('1003', 'Citra Lestari', 'XII RPL 1'),
  ('1004', 'Dewi Sartika', 'XII RPL 1'),
  ('1005', 'Eko Prasetyo', 'XII RPL 1')
ON CONFLICT (nis) DO NOTHING;
