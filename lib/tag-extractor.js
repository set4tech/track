import OpenAI from 'openai';
import { sql } from './database.js';
import { getConfig } from './config.js';

const config = getConfig();
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export async function getAllExistingTags() {
  try {
    const result = await sql`
      SELECT id, name, description, usage_count 
      FROM tags 
      ORDER BY usage_count DESC, name ASC
    `;
    return result.rows;
  } catch (error) {
    console.error('Error fetching existing tags:', error);
    return [];
  }
}

export async function extractTagsFromDecision(decision) {
  const existingTags = await getAllExistingTags();
  
  const systemPrompt = `You are a tag extraction assistant for a decision tracking system. Your task is to analyze decision content and assign relevant topic/theme tags.

Existing tags in the system:
${existingTags.map(tag => `- ${tag.name}${tag.description ? ` (${tag.description})` : ''}`).join('\n')}

Rules:
1. Try to reuse existing tags when they are relevant
2. Only create new tags when no existing tag adequately captures the theme
3. Assign 1-4 tags per decision (most commonly 2-3)
4. Tags should be broad themes/topics, not specific details
5. Tags should be lowercase, use hyphens for spaces (e.g., "product-design")
6. Focus on the main subject matter, department, or area of impact

Return a JSON array of tag objects with this structure:
[
  {
    "name": "tag-name",
    "isNew": true/false,
    "description": "Brief description (only for new tags)"
  }
]`;

  const userPrompt = `Extract tags for this decision:

Decision Summary: ${decision.decision_summary}
Topic: ${decision.topic || 'N/A'}
Type: ${decision.decision_type || 'N/A'}
Impact Scope: ${decision.impact_scope || 'N/A'}
Context: ${decision.parsed_context || 'N/A'}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    // Ensure we have an array of tags
    const tags = Array.isArray(result) ? result : (result.tags || []);
    
    return tags.filter(tag => tag.name && tag.name.length > 0);
  } catch (error) {
    console.error('Error extracting tags:', error);
    return [];
  }
}

export async function createOrGetTag(tagData) {
  try {
    // First try to get existing tag
    let tag = await sql`
      SELECT id, name FROM tags WHERE name = ${tagData.name}
    `;
    
    if (tag.rows.length > 0) {
      return tag.rows[0];
    }
    
    // Create new tag if it doesn't exist
    const result = await sql`
      INSERT INTO tags (name, description)
      VALUES (${tagData.name}, ${tagData.description || null})
      RETURNING id, name
    `;
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/getting tag:', error);
    throw error;
  }
}

export async function attachTagsToDecision(decisionId, tags) {
  try {
    console.log(`Attaching ${tags.length} tags to decision ${decisionId}`);
    
    // Process each tag
    for (const tagData of tags) {
      const tag = await createOrGetTag(tagData);
      console.log(`Created/retrieved tag: ${tag.name} (ID: ${tag.id})`);
      
      // Create the relationship (ignore if already exists due to UNIQUE constraint)
      await sql`
        INSERT INTO decision_tags (decision_id, tag_id)
        VALUES (${decisionId}, ${tag.id})
        ON CONFLICT (decision_id, tag_id) DO NOTHING
      `;
    }
    
    console.log(`Successfully attached tags to decision ${decisionId}`);
    return true;
  } catch (error) {
    console.error('Error attaching tags to decision:', error);
    return false;
  }
}

export async function getTagsForDecision(decisionId) {
  try {
    const result = await sql`
      SELECT t.id, t.name, t.description
      FROM tags t
      JOIN decision_tags dt ON t.id = dt.tag_id
      WHERE dt.decision_id = ${decisionId}
      ORDER BY t.name
    `;
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching tags for decision:', error);
    return [];
  }
}