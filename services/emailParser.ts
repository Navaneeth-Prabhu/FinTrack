// Regular expressions for common transaction patterns
const TRANSACTION_PATTERNS = [
    // Credit card transactions
    {
      name: 'credit_card_transaction',
      regex: /(?:charged|payment|purchase|transaction)\s+(?:of|for)?\s*(?:INR|USD|\$|Rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?)/i,
      type: 'expense',
      extractAmount: (match) => parseFloat(match[1].replace(/,/g, '')),
      category: (text) => categorizeTransaction(text)
    },
    // Bank debit
    {
      name: 'bank_debit',
      regex: /(?:debited|withdrawn|paid|deducted)\s+(?:with)?\s*(?:INR|USD|\$|Rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?)/i,
      type: 'expense',
      extractAmount: (match) => parseFloat(match[1].replace(/,/g, '')),
      category: (text) => categorizeTransaction(text)
    },
    // Bank credit
    {
      name: 'bank_credit',
      regex: /(?:credited|received|deposited|added)\s+(?:with)?\s*(?:INR|USD|\$|Rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?)/i,
      type: 'income',
      extractAmount: (match) => parseFloat(match[1].replace(/,/g, '')),
      category: (text) => 'income'
    },
    // Online payments
    {
      name: 'online_payment',
      regex: /(?:paid|payment|sent)\s+(?:INR|USD|\$|Rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?)\s+(?:to|for|via|using)/i,
      type: 'expense',
      extractAmount: (match) => parseFloat(match[1].replace(/,/g, '')),
      category: (text) => categorizeTransaction(text)
    },
    // Bill payments
    {
      name: 'bill_payment',
      regex: /(?:bill|invoice)\s+(?:payment|paid)\s+(?:of|for)?\s*(?:INR|USD|\$|Rs\.?|₹)?\s*([0-9,]+(?:\.\d{2})?)/i,
      type: 'expense',
      extractAmount: (match) => parseFloat(match[1].replace(/,/g, '')),
      category: (text) => 'bills'
    }
  ];
  
  // Transaction categorization based on keywords
  const CATEGORY_KEYWORDS = {
    'food': ['restaurant', 'cafe', 'dining', 'pizza', 'burger', 'food', 'swiggy', 'zomato', 'doordash', 'ubereats', 'grocery', 'supermarket'],
    'transport': ['uber', 'lyft', 'taxi', 'cab', 'metro', 'train', 'bus', 'fuel', 'gas', 'petrol', 'parking', 'ola'],
    'shopping': ['amazon', 'flipkart', 'walmart', 'target', 'shop', 'store', 'purchase', 'buy', 'mall', 'retail', 'clothing', 'fashion'],
    'entertainment': ['netflix', 'prime', 'spotify', 'disney', 'movie', 'ticket', 'concert', 'event', 'show', 'game', 'subscription'],
    'travel': ['hotel', 'flight', 'booking', 'airbnb', 'airline', 'travel', 'vacation', 'trip', 'tour', 'holiday'],
    'health': ['medical', 'doctor', 'hospital', 'clinic', 'pharmacy', 'medicine', 'healthcare', 'dental', 'fitness', 'gym'],
    'bills': ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'mobile', 'phone', 'bill', 'utility', 'rent', 'subscription'],
    'education': ['school', 'college', 'university', 'course', 'class', 'tuition', 'fee', 'book', 'education', 'learning']
  };
  
  // Categorize transaction based on text
  const categorizeTransaction = (text) => {
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  };
  
  // Extract merchant/payee name from text
  const extractMerchant = (text) => {
    // Common patterns for merchant names
    const merchantPatterns = [
      /(?:at|to|from|via)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+on|\s+for|\s+dated|$)/i,
      /(?:payment to|paid to|merchant)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+on|\s+for|\s+dated|$)/i,
      /(?:purchase at|buying from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+on|\s+for|\s+dated|$)/i
    ];
    
    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Clean up merchant name
        return match[1].trim().replace(/\s+/g, ' ');
      }
    }
    
    return 'Unknown';
  };
  
  // Extract date from text or use email date
  const extractDate = (text, defaultDate) => {
    // Common date patterns
    const datePatterns = [
      // DD/MM/YYYY or MM/DD/YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
      // Month name formats
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{2,4})/i,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[\s,]+(\d{2,4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Different date formats might need specific handling
          let day, month, year;
          
          if (match.length === 4) {
            // DD/MM/YYYY or MM/DD/YYYY format
            // Assuming DD/MM/YYYY for simplicity, adjust as needed
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1; // JS months are 0-based
            year = parseInt(match[3]);
            
            // Handle 2-digit years
            if (year < 100) {
              year += year < 50 ? 2000 : 1900;
            }
          } else if (match.length >= 4) {
            // Month name formats
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            
            if (isNaN(parseInt(match[1]))) {
              // Format: Month DD, YYYY
              month = monthNames.indexOf(match[1].toLowerCase().substring(0, 3));
              day = parseInt(match[2]);
              year = parseInt(match[3]);
            } else {
              // Format: DD Month YYYY
              day = parseInt(match[1]);
              month = monthNames.indexOf(match[2].toLowerCase().substring(0, 3));
              year = parseInt(match[3]);
            }
          }
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
            return new Date(year, month, day);
          }
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
    }
    
    // Return email date if no date found in text
    return defaultDate;
  };
  
  // Parse email content to extract transaction
  export const parseEmailForTransactions = (email) => {
    try {
      const text = email.body || email.snippet;
      const transactions = [];
      
      // Try to match transaction patterns
      for (const pattern of TRANSACTION_PATTERNS) {
        const match = text.match(pattern.regex);
        
        if (match) {
          const amount = pattern.extractAmount(match);
          
          if (!isNaN(amount) && amount > 0) {
            const transaction = {
              id: `${email.id}-${transactions.length}`,
              amount,
              type: pattern.type,
              category: pattern.category(text),
              merchant: extractMerchant(text),
              date: extractDate(text, email.date),
              source: 'email',
              sourceId: email.id,
              subject: email.subject,
              description: email.snippet,
              rawText: text
            };
            
            transactions.push(transaction);
          }
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Error parsing email for transactions:', error);
      return [];
    }
  };
  
  // Parse multiple emails and extract transactions
  export const parseEmailsForTransactions = (emails) => {
    try {
      let allTransactions = [];
      
      for (const email of emails) {
        const emailTransactions = parseEmailForTransactions(email);
        allTransactions = [...allTransactions, ...emailTransactions];
      }
      
      // Sort by date, newest first
      allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return allTransactions;
    } catch (error) {
      console.error('Error parsing emails for transactions:', error);
      return [];
    }
  };
  
  export default {
    parseEmailForTransactions,
    parseEmailsForTransactions
  };