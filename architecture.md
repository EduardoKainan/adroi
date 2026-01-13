# AdRoi SaaS - Technical Architecture

## 1. Automation Workflows (n8n)

### Workflow A: Daily Data Ingestion (Meta Ads)
**Trigger:** Cron Schedule (Every day at 04:00 AM)
1. **Node: Get Active Clients**
   - Query Supabase `clients` where `status = 'active'` and `ad_account_id` is not null.
2. **Node: Split In Batches**
   - Loop through clients to avoid API rate limits.
3. **Node: Meta Ads API Request**
   - Endpoint: `/act_{ad_account_id}/insights`
   - Fields: `campaign_id, campaign_name, spend, impressions, clicks, actions(purchase_value)`
   - Date Preset: `yesterday`
4. **Node: Transform Data**
   - Map Meta response to Supabase schema.
   - Calculate `revenue` from `action_values`.
5. **Node: Upsert Campaigns**
   - Insert new campaigns into `campaigns` table if they don't exist.
6. **Node: Upsert Metrics**
   - Insert stats into `campaign_metrics` matching `campaign_id` + `date`.

### Workflow B: Smart Alerts (Monitor)
**Trigger:** Cron Schedule (Every day at 08:00 AM)
1. **Node: Execute SQL Function**
   - Check `client_monthly_stats` for current month.
2. **Node: Logic Filter**
   - IF `roas < 2.0` (or client specific threshold).
   - OR IF `estimated_roi < 0`.
3. **Node: Send Notification**
   - Email/Slack to the Account Manager: "Alert: Client X ROAS dropped to 1.5x yesterday."

## 2. Security Strategy (RLS)
The system relies entirely on Supabase Row Level Security.
- **Tenant Isolation:** Every table has a `tenant_id` (direct or via join).
- **Policies:**
  - `SELECT`: Only rows where `tenant_id` matches user's `tenant_id`.
  - `INSERT/UPDATE`: Only strictly for Managers/Admins of that tenant.
- **Edge Functions:** Used for sensitive operations like billing or inviting new users, utilizing `service_role` key but verifying user JWT first.

## 3. Roadmap & Scalability

### Phase 1: MVP (Current Design)
- Manual Meta Token input.
- Basic Contract Management.
- Daily Sync.

### Phase 2: Integrations
- **Google Ads API:** Similar structure to Meta workflow.
- **CRM Webhook Receiver:** Endpoint to receive `deal_won` events from HubSpot/Pipedrive to populate `deals` table automatically for accurate Offline Conversions.

### Phase 3: White-Label & Billing
- **Stripe Integration:** Subscription management for the SaaS itself.
- **Custom Domain Support:** Middleware in Next.js to route `client.agency.com` to the specific Tenant dashboard.
- **AI Reports:** Use OpenAI API via n8n to generate a text summary: "This month, spending increased 10% but ROAS maintained at 4x, resulting in net profit growth."
