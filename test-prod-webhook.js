#!/usr/bin/env node

import fetch from 'node-fetch';
import FormData from 'form-data';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Test the production webhook
const testWebhook = async () => {
  const form = new FormData();
  
  // Test with TO field
  form.append('from', 'test@example.com');
  form.append('to', 'decisions+dev@bot.set4.io');
  form.append('subject', 'Test Decision');
  form.append('text', 'I have decided to test the webhook. This is my decision.');
  form.append('headers', `Message-ID: <test-${Date.now()}@example.com>\nDate: ${new Date().toUTCString()}`);
  
  // Add protection bypass if available
  const headers = form.getHeaders();
  if (process.env.VERCEL_PROTECTION_BYPASS) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_PROTECTION_BYPASS;
  }

  console.log('📧 Testing production webhook...');
  console.log('URL: https://track-set4.vercel.app/api/webhook-inbound');
  console.log('To:', 'decisions+dev@bot.set4.io');
  console.log('');

  try {
    const response = await fetch('https://track-set4.vercel.app/api/webhook-inbound', {
      method: 'POST',
      body: form,
      headers: headers
    });

    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testWebhook();