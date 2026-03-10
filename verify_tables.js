import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ypvbavqvopbegvbkgusb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdmJhdnF2b3BiZWd2YmtndXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5Mzc3MDIsImV4cCI6MjA4ODUxMzcwMn0.EelrCMkhB5Bbcq20JO6bcc1RXatu11RKWEkVZxVAiww';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  const tables = ['profiles', 'observations', 'pedagogical_suggestions'];
  console.log('Verifying table presence...');
  
  for (const table of tables) {
    try {
      // We use a harmless select with limit 0 to check if the table exists and is accessible
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.log(`Table '${table}': NOT FOUND (Error 42P01)`);
        } else {
          console.log(`Table '${table}': ERROR (${error.code}) - ${error.message}`);
        }
      } else {
        console.log(`Table '${table}': FOUND AND ACCESSIBLE`);
      }
    } catch (err) {
      console.log(`Table '${table}': EXCEPTION - ${err.message}`);
    }
  }
}

verifyTables();
