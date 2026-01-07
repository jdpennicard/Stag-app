-- Create email_templates table for admin-managed email templates
-- This allows admins to create and edit email templates without code changes

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "signup_welcome", "payment_approved", "deadline_reminder"
  subject TEXT NOT NULL, -- Email subject (can contain variables like {name})
  body_text TEXT NOT NULL, -- Plain text email body
  body_html TEXT, -- HTML email body (optional, falls back to text if not provided)
  description TEXT, -- Admin description of when this template is used
  event_type TEXT NOT NULL, -- e.g., "signup", "payment_submitted", "payment_approved", "deadline_reminder"
  enabled BOOLEAN DEFAULT true, -- Allow disabling templates without deleting
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for event_type lookups
CREATE INDEX IF NOT EXISTS email_templates_event_type_idx ON email_templates(event_type) WHERE enabled = true;

-- Create email_log table to track sent emails
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  template_name TEXT, -- Store name for historical reference
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  variables_used JSONB, -- Store the variables that were substituted
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for email_log lookups
CREATE INDEX IF NOT EXISTS email_log_recipient_email_idx ON email_log(recipient_email);
CREATE INDEX IF NOT EXISTS email_log_template_id_idx ON email_log(template_id);
CREATE INDEX IF NOT EXISTS email_log_status_idx ON email_log(status);
CREATE INDEX IF NOT EXISTS email_log_created_at_idx ON email_log(created_at);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
-- Admins can do everything
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Authenticated users can view enabled templates (for preview)
CREATE POLICY "Authenticated users can view enabled templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (enabled = true);

-- RLS Policies for email_log
-- Admins can view all email logs
CREATE POLICY "Admins can view email logs"
  ON email_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Users can view their own email logs
CREATE POLICY "Users can view own email logs"
  ON email_log FOR SELECT
  TO authenticated
  USING (
    recipient_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Service role can insert email logs (for API routes)
-- Note: This is handled via service role key, but we add a policy for completeness
CREATE POLICY "Service can insert email logs"
  ON email_log FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE email_templates IS 'Admin-managed email templates with variable substitution support';
COMMENT ON TABLE email_log IS 'Log of all emails sent through the system';
COMMENT ON COLUMN email_templates.event_type IS 'Type of event that triggers this template (e.g., signup, payment_approved)';
COMMENT ON COLUMN email_log.variables_used IS 'JSON object storing the variables that were substituted in the template';

