-- Database Schema for Personal Task Management App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    order_index FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Types Enum
DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('Work', 'Personal', 'Learning', 'Creative', 'Admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description_markdown TEXT,
    goal TEXT,
    context_markdown TEXT,
    project_type project_type DEFAULT 'Work',
    ai_instructions TEXT,
    current_focus TEXT,
    target_date DATE
);

-- Task Status Enum
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('In Progress', 'Done', 'KIV');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    notes_markdown TEXT,
    status task_status DEFAULT 'In Progress',
    urgent BOOLEAN DEFAULT FALSE,
    important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    order_index FLOAT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
