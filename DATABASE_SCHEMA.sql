-- =====================================================
-- Schedulator Database Schema - Complete Setup
-- =====================================================
-- Copy and paste this entire file into your Supabase SQL editor
-- to set up all tables, policies, and functions for the app

-- =====================================================
-- REQUIREMENTS TABLE (Core functionality)
-- =====================================================

-- Create requirements table
CREATE TABLE requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Core', 'Major', 'Pre-graduate')),
  course_options JSONB DEFAULT '[]'::jsonb, -- Array of course objects: [{"code": "MATH 101", "name": "Calculus I"}, ...]
  credits INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_with_course VARCHAR(20), -- Which specific course was used to complete this
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security for requirements
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Requirements Policies
CREATE POLICY "Users can view their own requirements" ON requirements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requirements" ON requirements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requirements" ON requirements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requirements" ON requirements
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- SEMESTER PLANNING TABLES
-- =====================================================

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

-- =====================================================
-- ROW LEVEL SECURITY FOR SEMESTER TABLES
-- =====================================================

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

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_requirements_updated_at 
  BEFORE UPDATE ON requirements 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

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

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX idx_requirements_user_id ON requirements(user_id);
CREATE INDEX idx_requirements_category ON requirements(category);
CREATE INDEX idx_requirements_completed ON requirements(is_completed);

CREATE INDEX idx_academic_years_user_id ON academic_years(user_id);
CREATE INDEX idx_academic_years_active ON academic_years(user_id, is_active);

CREATE INDEX idx_semesters_user_id ON semesters(user_id);
CREATE INDEX idx_semesters_academic_year ON semesters(academic_year_id);
CREATE INDEX idx_semesters_year_term ON semesters(year, term_type);

CREATE INDEX idx_scheduled_courses_user_id ON scheduled_courses(user_id);
CREATE INDEX idx_scheduled_courses_semester ON scheduled_courses(semester_id);
CREATE INDEX idx_scheduled_courses_requirement ON scheduled_courses(requirement_id);
CREATE INDEX idx_scheduled_courses_status ON scheduled_courses(status);

-- =====================================================
-- DATA MIGRATION (for existing users)
-- =====================================================

-- Migration for existing requirements (if you have existing data)
-- This converts the old course_code field to the new course_options format
-- Uncomment the following lines if you have existing requirements with course_code
/*
UPDATE requirements 
SET course_options = 
  CASE 
    WHEN course_code IS NOT NULL AND course_code != '' 
    THEN jsonb_build_array(jsonb_build_object('code', course_code, 'name', ''))
    ELSE '[]'::jsonb
  END
WHERE course_options IS NULL OR course_options = '[]'::jsonb;
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- All tables, policies, functions, and indexes have been created.
-- Your Schedulator app is now ready to use!
-- 
-- Next steps:
-- 1. Test the requirements functionality
-- 2. Navigate to "Semester Planning" in the app
-- 3. Start dragging courses from requirements to semesters
-- 
-- The system will automatically create default academic years 
-- and semesters when you first use the semester planning feature.