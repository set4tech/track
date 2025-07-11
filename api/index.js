import { getConfig } from '../lib/config.js';
import { requireAuth, generateCSRFToken } from '../lib/auth.js';
import { generateIntegratedAuthHTML } from '../lib/auth-ui.js';
import { getDecisionsForUser, getDecisionsWithTags, getAllAvailableTags, getTotalDecisionsCount } from '../lib/decision-queries.js';
import { generateDecisionHTML } from '../lib/ui/html-generator.js';

export default async function handler(req, res) {
  try {
    console.log('Starting index handler...');
    const { team_id, tags, filter_mode = 'any', role } = req.query;
    const config = getConfig();
    console.log('Config loaded:', config.environment);
    
    // Check authentication
    const auth = await requireAuth(req, res);
    console.log('Auth check complete:', auth.authenticated);
    
    // Generate CSRF token for auth forms
    const csrfToken = generateCSRFToken();
    
    // Parse tags from query string (can be comma-separated or array)
    const tagIds = tags ? (Array.isArray(tags) ? tags : tags.split(',')).map(id => parseInt(id, 10)) : [];
    
    // Fetch decisions for user
    const rows = await getDecisionsForUser(auth, team_id, tagIds, filter_mode, role);
    
    // Fetch tags for each decision
    const decisionsWithTags = await getDecisionsWithTags(rows);
    
    // Get all available tags for the filter
    const availableTags = await getAllAvailableTags();
    
    // Get total count of user's decisions for display
    const totalDecisions = await getTotalDecisionsCount(auth);
    
    const html = generateDecisionHTML({
      config,
      auth,
      csrfToken,
      decisionsWithTags,
      availableTags,
      totalDecisions,
      tagIds,
      filterMode: filter_mode,
      role,
      generateIntegratedAuthHTML
    });
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('UI error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
