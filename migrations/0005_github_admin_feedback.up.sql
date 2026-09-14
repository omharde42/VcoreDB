-- Migration 0005: GitHub Integration, Platform Admin, Feedback, Issues, and Audit Logs

CREATE TABLE IF NOT EXISTS core.github_accounts (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id BIGINT REFERENCES auth.users(id) ON DELETE CASCADE,
    github_user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS core.github_repos (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    project_id BIGINT REFERENCES core.projects(id) ON DELETE CASCADE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    branch TEXT DEFAULT 'main' NOT NULL,
    github_url TEXT NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS core.github_analysis (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    project_id BIGINT REFERENCES core.projects(id) ON DELETE CASCADE,
    framework TEXT DEFAULT 'Node.js / Express' NOT NULL,
    language TEXT DEFAULT 'TypeScript' NOT NULL,
    package_manager TEXT DEFAULT 'npm' NOT NULL,
    total_files INT DEFAULT 42 NOT NULL,
    lines_of_code INT DEFAULT 3850 NOT NULL,
    security_issues JSONB DEFAULT '[]' NOT NULL,
    metrics JSONB DEFAULT '{}' NOT NULL,
    analyzed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS core.feedback (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id BIGINT REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT DEFAULT 'Feature Request' NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' NOT NULL,
    status TEXT DEFAULT 'new' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS core.issues (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id BIGINT REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id BIGINT REFERENCES core.projects(id) ON DELETE CASCADE,
    page TEXT DEFAULT '/dashboard' NOT NULL,
    severity TEXT DEFAULT 'medium' NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    description TEXT NOT NULL,
    error_context JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() NOT NULL,
    project_id BIGINT REFERENCES core.projects(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES auth.users(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    severity TEXT DEFAULT 'info' NOT NULL,
    metadata JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
