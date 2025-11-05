const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bnankphxrceakdazrhbs.supabase.co'\;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuYW5rcGh4cmNlYWtkYXpyaGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzczMzIsImV4cCI6MjA3NzE1MzMzMn0.RzP7LCkiCVXT7kGvq5YoHar6WO4SEA7vXSJe8Mnro9U';

const supabase = createClient(supabaseUrl, supabaseKey);

const checkProcedures = async () => {
  const { data, error } = await supabase
    .from('procedures')
    .select('*');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Procedures count:', data.length);
    console.log('Procedures:', data);
  }
};

checkProcedures();
