
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbahrlikhfcpypvwprgz.supabase.co';
const supabaseAnonKey = 'sb_publishable_g8KC6eby-xuW_47gQp5LVA_sEzR0Wfy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
