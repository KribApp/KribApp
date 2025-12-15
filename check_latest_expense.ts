
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestExpense() {
    const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching expense:', error);
        return;
    }

    if (!expenses || expenses.length === 0) {
        console.log('No expenses found.');
        return;
    }

    const expense = expenses[0];
    console.log('Latest Expense:', expense);

    const { data: shares, error: sharesError } = await supabase
        .from('expense_shares')
        .select('*')
        .eq('expense_id', expense.id);

    if (sharesError) {
        console.error('Error fetching shares:', sharesError);
        return;
    }

    console.log('Shares for this expense:', shares);

    // Check math
    const totalShares = shares.reduce((sum, s) => sum + s.owed_amount, 0);
    console.log(`Total Expense Amount: ${expense.amount}`);
    console.log(`Sum of Shares: ${totalShares}`);
    console.log(`Difference: ${expense.amount - totalShares}`);
}

checkLatestExpense();
