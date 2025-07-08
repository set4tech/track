import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Your exact email data
    const emailData = {
      from: 'Will Maclean <will@set4.io>',
      to: 'Will Maclean <will@set4.io>, decision@bot.set4.io',
      cc: undefined,
      subject: 'Re: re yday',
      text: 'yes, confirmed.\r\n\r\nOn Tue, 8 Jul 2025 at 14:11, Will Maclean <will@set4.io> wrote:\r\n\r\n> can you confirm?\r\n>\r\n> On Tue, 8 Jul 2025 at 14:10, Will Maclean <will@set4.io> wrote:\r\n>\r\n>>\r\n>> shall we make a cake?\r\n>>\r\n>> --\r\n>> Will Maclean\r\n>> Co-founder @ *set4.io <http://set4.io>*\r\n>>\r\n>> +44 7724 409 444\r\n>> LinkedIn <https://www.linkedin.com/in/willmaclean/>\r\n>>\r\n>\r\n'
    };

    console.log('Testing decision parsing with your exact email...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",          content: `Extract decision information from email threads. Decisions can be expressed in various ways:

- Direct statements: "We will proceed with X", "I decide to do Y", "Let's go with option Z"
- Confirmations: "Yes, confirmed", "Agreed", "That works", "Sounds good", "Let's do it"
- Approvals: "Approved", "Go ahead", "Green light", "You have my approval"
- Commitments: "I'll handle this", "We're committed to X", "Count me in"
- Selections: "I choose A", "We'll go with B", "Option C is best"
- Authorizations: "You're authorized to proceed", "Permission granted"

Pay special attention to conversational context - a simple "yes" in response to "Should we do X?" is a decision.

Return JSON with:
          - decision_summary: Clear, concise statement of what was decided (max 200 chars)
          - decision_maker: Email of person who made the decision (from the From field)
          - witnesses: Array of all other email addresses in the thread
          - decision_date: When decision was made (ISO format)
          - topic: Main subject area (2-5 words)
          - parameters: Object with key details like:
            - budget: amount if mentioned
            - timeline: dates/deadlines
            - resources: people/tools needed
            - scope: what's included/excluded
            - success_criteria: how to measure success
          - priority: critical/high/medium/low
          - decision_type: technical/budget/timeline/personnel/strategic/operational
          - deadline: If mentioned (ISO format)
          - impact_scope: team/department/company/external
          - confidence: 0-100 score of how confident you are this is a decision
          - key_points: Array of 3-5 bullet points explaining the decision
          
          Only extract if confidence > 70. Return null if no clear decision found.`
      }, {
        role: "user", 
        content: `Email thread:\nFrom: ${emailData.from}\nTo: ${emailData.to}\nCC: ${emailData.cc}\nSubject: ${emailData.subject}\n\n${emailData.text}`
      }],
      response_format: { type: "json_object" }
    });
    
    const parsed = JSON.parse(completion.choices[0].message.content);
    
    res.status(200).json({
      status: 'test_complete',
      email_data: emailData,
      openai_result: parsed,
      would_be_logged: parsed && parsed.confidence >= 70
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
}
