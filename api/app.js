import { getConfig } from '../lib/config.js';
import { requireAuth, generateCSRFToken } from '../lib/auth.js';
import { generateIntegratedAuthHTML } from '../lib/auth-ui.js';
import {
  getDecisionsForUser,
  getDecisionsWithTags,
  getTotalDecisionsCount,
} from '../lib/decision-queries.js';
import { generateDecisionHTML } from '../lib/ui/html-generator.js';

// Helper function to get available tags from visible decisions
function getAvailableTagsFromDecisions(decisionsWithTags) {
  const tagMap = new Map();

  decisionsWithTags.forEach((decision) => {
    if (decision.tags && decision.tags.length > 0) {
      decision.tags.forEach((tag) => {
        if (tagMap.has(tag.id)) {
          tagMap.get(tag.id).decision_count++;
        } else {
          tagMap.set(tag.id, {
            id: tag.id,
            name: tag.name,
            description: tag.description,
            decision_count: 1,
          });
        }
      });
    }
  });

  // Convert to array and sort by decision count (descending) then name
  return Array.from(tagMap.values()).sort((a, b) => {
    if (b.decision_count !== a.decision_count) {
      return b.decision_count - a.decision_count;
    }
    return a.name.localeCompare(b.name);
  });
}

export default async function handler(req, res) {
  try {
    console.log('Starting app handler...');
    const { team_id, tags, filter_mode = 'any', priority, gmail_syncing } = req.query;
    const config = getConfig();
    console.log('Config loaded:', config.environment);
    // Check authentication
    const auth = await requireAuth(req, res);
    console.log('Auth check complete:', auth.authenticated);

    // Generate CSRF token for auth forms
    const csrfToken = generateCSRFToken();

    // Parse tags from query string (can be comma-separated or array)
    const tagIds = tags
      ? (Array.isArray(tags) ? tags : tags.split(',')).map((id) => parseInt(id, 10))
      : [];

    // Fetch decisions for user
    const rows = await getDecisionsForUser(auth, team_id, tagIds, filter_mode, priority);

    // Fetch tags for each decision
    const decisionsWithTags = await getDecisionsWithTags(rows);

    // Get only tags that appear in the user's visible decisions
    const availableTags = getAvailableTagsFromDecisions(decisionsWithTags);

    // Get total count of user's decisions for display
    const totalDecisions = await getTotalDecisionsCount(auth);

    const html = generateDecisionHTML({
      config: { ...config, priorityFilter: priority },
      auth,
      csrfToken,
      decisionsWithTags,
      availableTags,
      totalDecisions,
      tagIds,
      filterMode: filter_mode,
      generateIntegratedAuthHTML,
      gmailSyncing: gmail_syncing === 'true',
    });
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('UI error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
  }
}
