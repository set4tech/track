#!/usr/bin/env node

import { sql } from '../lib/database.js';
import { extractTagsFromDecision, attachTagsToDecision } from '../lib/tag-extractor.js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function backfillTags() {
  console.log('🏷️  Backfilling tags for existing decisions...\n');
  
  try {
    // Get all decisions without tags
    const result = await sql`
      SELECT d.*
      FROM decisions d
      LEFT JOIN decision_tags dt ON d.id = dt.decision_id
      WHERE dt.decision_id IS NULL
        AND d.status = 'confirmed'
      ORDER BY d.created_at DESC
    `;
    
    console.log(`Found ${result.rows.length} decisions without tags\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const decision of result.rows) {
      console.log(`Processing decision ${decision.id}: ${decision.decision_summary.substring(0, 50)}...`);
      
      try {
        // Extract tags
        const tags = await extractTagsFromDecision(decision);
        console.log(`  Extracted ${tags.length} tags: ${tags.map(t => t.name).join(', ')}`);
        
        if (tags.length > 0) {
          // Attach tags
          const attached = await attachTagsToDecision(decision.id, tags);
          if (attached) {
            console.log('  ✅ Tags attached successfully');
            successCount++;
          } else {
            console.log('  ⚠️  Failed to attach tags');
            errorCount++;
          }
        } else {
          console.log('  ℹ️  No tags extracted');
        }
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ Backfill complete!`);
    console.log(`   Successfully tagged: ${successCount} decisions`);
    console.log(`   Errors: ${errorCount} decisions`);
    
    // Show tag summary
    const tagSummary = await sql`
      SELECT t.name, COUNT(DISTINCT dt.decision_id) as count
      FROM tags t
      JOIN decision_tags dt ON t.id = dt.tag_id
      GROUP BY t.name
      ORDER BY count DESC
    `;
    
    console.log('\n📊 Tag Summary:');
    tagSummary.rows.forEach(tag => {
      console.log(`   ${tag.name}: ${tag.count} decisions`);
    });
    
  } catch (error) {
    console.error('Backfill error:', error);
  }
}

// Run the backfill
backfillTags().catch(console.error);