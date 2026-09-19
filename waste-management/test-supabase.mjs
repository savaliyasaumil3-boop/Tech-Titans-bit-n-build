const supabaseUrl = 'https://whsprzbykknofztmhypa.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc3ByemJ5a2tub2Z6dG1oeXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MDI1NTIsImV4cCI6MjEwNTM3ODU1Mn0.SHSZ68Rb1k-WB6bAMMGvKp0j2vpOIbPnAED348vgds8';

async function testConnection() {
  console.log('Testing Supabase Connection via REST API...');
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/bins?select=*&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (!res.ok) {
      console.error(`HTTP Error: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.error('Response:', text);
    } else {
      const data = await res.json();
      console.log('Connection successful!');
      console.log('Data returned from "bins" table:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testConnection();
