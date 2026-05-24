/**
 * Enhanced parsing logic for various email types.
 * Multi-file support in Apps Script means this function is globally available.
 */
function parseEmailContent(message) {
  const body = message.getPlainBody();
  const subject = message.getSubject();
  const date = message.getDate();
  
  let amount = 'Unknown';
  let description = subject;

  // Specific Parser: Google Workspace Payment
  // Pattern: "Google Workspace: We've received your payment for bay1cg.com"
  if (subject.includes('Google Workspace') && (subject.includes('payment') || body.includes('payment'))) {
    // Extract domain from subject or body
    const domainMatch = subject.match(/for\s+([\w\.-]+)/) || body.match(/customer ID:\s+([\w\.-]+)/);
    const domain = domainMatch ? domainMatch[1] : 'bay1cg.com';
    
    // Extract amount from body: "Your payment of $12.00 was applied..."
    const amountMatch = body.match(/Your payment of\s+\$([0-9,]+\.[0-9]{2})/) || body.match(/\$([0-9,]+\.[0-9]{2})/);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
    }
    
    description = `Google Workspace Payment: ${domain}`;
  } 
  // Fallback Parser
  else {
    const amountMatch = body.match(/\$\s?([0-9,]+\.[0-9]{2})/);
    if (amountMatch) {
      amount = amountMatch[1].replace(/,/g, '');
    }
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    description = lines.length > 0 ? lines[0].substring(0, 100) : subject;
  }

  return {
    date: date,
    amount: amount,
    description: description,
    Proposed_Category: 'Uncategorized',
    Proposed_Account: 'General'
  };
}
