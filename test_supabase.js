const { createClient } = require('@supabase/supabase-js');

try {
    console.log('Attempting to create client with empty strings...');
    const client = createClient('', '');
    console.log('Client created successfully');
} catch (error) {
    console.error('Error creating client:', error.message);
}

try {
    console.log('Attempting to create client with undefined...');
    const client = createClient(undefined, undefined);
    console.log('Client created successfully');
} catch (error) {
    console.error('Error creating client with undefined:', error.message);
}
