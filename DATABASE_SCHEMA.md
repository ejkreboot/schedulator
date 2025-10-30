# Supabase Database Schema

## Requirements Table

Create this table in your Supabase project:

```sql
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

-- Enable Row Level Security
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own requirements
CREATE POLICY "Users can view their own requirements" ON requirements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requirements" ON requirements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requirements" ON requirements
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requirements" ON requirements
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_requirements_updated_at 
  BEFORE UPDATE ON requirements 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Migration for existing users (if you have existing data)
-- This converts the old course_code field to the new course_options format
UPDATE requirements 
SET course_options = 
  CASE 
    WHEN course_code IS NOT NULL AND course_code != '' 
    THEN jsonb_build_array(jsonb_build_object('code', course_code, 'name', ''))
    ELSE '[]'::jsonb
  END
WHERE course_options IS NULL OR course_options = '[]'::jsonb;
```

## Table Structure

- **id**: Primary key (UUID)
- **user_id**: Foreign key to auth.users (UUID) 
- **title**: Requirement name (VARCHAR 255)
- **description**: Detailed description (TEXT)
- **category**: One of 'Core', 'Major', 'Pre-graduate' (VARCHAR 50)
- **course_options**: JSONB array of course objects with code and name (JSONB)
- **credits**: Number of credit hours (INTEGER)
- **is_completed**: Completion status (BOOLEAN)
- **completed_with_course**: Specific course code used to complete requirement (VARCHAR 20)
- **priority**: Priority level 1-5 (INTEGER)
- **notes**: Additional notes (TEXT)
- **created_at**: Creation timestamp (TIMESTAMP)
- **updated_at**: Last update timestamp (TIMESTAMP)

### Course Options Format
The `course_options` field stores an array of course objects:
```json
[
  {"code": "MATH 101", "name": "Calculus I"},
  {"code": "MATH 151", "name": "Engineering Calculus I"},
  {"code": "MATH 131", "name": "Applied Calculus I"}
]
```

## Security

- Row Level Security (RLS) is enabled
- Users can only access their own requirements
- All CRUD operations are protected by user authentication

## Semester Planning Tables

### Academic Years Table
Stores academic year information for organizing semesters.

### Semesters Table
Stores individual semester information with credit limits and dates.

### Scheduled Courses Table
Stores courses scheduled in specific semesters, linked to requirements.

For the complete SQL schema including all semester planning tables, see `DATABASE_SCHEMA.sql`.