-- Semester Planning Database Migration
-- Run this in your Supabase SQL editor

-- Create academic_years table
CREATE TABLE academic_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL, -- e.g., "2024-2025", "Junior Year"
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE, -- Only one active year per user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create semesters table
CREATE TABLE semesters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "Fall 2024", "Spring 2025"
  term_type VARCHAR(20) NOT NULL CHECK (term_type IN ('Fall', 'Spring', 'Summer', 'Winter')),
  year INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  max_credits INTEGER DEFAULT 18, -- Credit hour limit
  current_credits INTEGER DEFAULT 0, -- Calculated field
  is_active BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create scheduled_courses table
CREATE TABLE scheduled_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE NOT NULL,
  requirement_id UUID REFERENCES requirements(id) ON DELETE SET NULL, -- Optional link to requirement
  course_code VARCHAR(20) NOT NULL,
  course_name VARCHAR(255),
  credits INTEGER NOT NULL DEFAULT 3,
  grade VARCHAR(5), -- A, B+, etc.
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'enrolled', 'completed', 'dropped')),
  notes TEXT,
  position_index INTEGER DEFAULT 0, -- For ordering within semester
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_courses ENABLE ROW LEVEL SECURITY;

-- Academic Years Policies
CREATE POLICY "Users can view their own academic years" ON academic_years
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own academic years" ON academic_years
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own academic years" ON academic_years
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own academic years" ON academic_years
  FOR DELETE USING (auth.uid() = user_id);

-- Semesters Policies
CREATE POLICY "Users can view their own semesters" ON semesters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own semesters" ON semesters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own semesters" ON semesters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own semesters" ON semesters
  FOR DELETE USING (auth.uid() = user_id);

-- Scheduled Courses Policies
CREATE POLICY "Users can view their own scheduled courses" ON scheduled_courses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled courses" ON scheduled_courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled courses" ON scheduled_courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled courses" ON scheduled_courses
  FOR DELETE USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_academic_years_updated_at 
  BEFORE UPDATE ON academic_years 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_semesters_updated_at 
  BEFORE UPDATE ON semesters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_courses_updated_at 
  BEFORE UPDATE ON scheduled_courses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_academic_years_user_id ON academic_years(user_id);
CREATE INDEX idx_semesters_user_id ON semesters(user_id);
CREATE INDEX idx_semesters_academic_year ON semesters(academic_year_id);
CREATE INDEX idx_scheduled_courses_user_id ON scheduled_courses(user_id);
CREATE INDEX idx_scheduled_courses_semester ON scheduled_courses(semester_id);
CREATE INDEX idx_scheduled_courses_requirement ON scheduled_courses(requirement_id);

-- Function to update semester credit totals
CREATE OR REPLACE FUNCTION update_semester_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current_credits for the affected semester
  UPDATE semesters 
  SET current_credits = (
    SELECT COALESCE(SUM(credits), 0) 
    FROM scheduled_courses 
    WHERE semester_id = COALESCE(NEW.semester_id, OLD.semester_id)
      AND status IN ('planned', 'enrolled', 'completed')
  )
  WHERE id = COALESCE(NEW.semester_id, OLD.semester_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create trigger to automatically update credit totals
CREATE TRIGGER update_semester_credits_trigger
  AFTER INSERT OR UPDATE OR DELETE ON scheduled_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_semester_credits();