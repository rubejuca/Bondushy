import { supabase } from './src/integrations/supabase/client';

const checkProcedures = async () => {
  const { data, error } = await supabase
    .from('procedures')
    .select('*');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Procedures:', data);
  }
};

checkProcedures();
