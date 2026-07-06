import { writeFileSync } from 'fs';

async function test() {
  const tokenRaw = '3qbPbJQYP6Hj0oOeVi56NbjMj5tOQuZC.OOlr1Kio4nl%2BP%2FjPyoP66eP8b5afnqa5LnAJ90G0hQI%3D';
  
  const headers = {
    'cookie': `better-auth.session_token=${tokenRaw}`,
    'authorization': `Bearer ${tokenRaw}`,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };

  const url = `https://tomomai.lol/api/auth/get-session`;
  
  console.log('Fetching:', url);
  const res = await fetch(url, { headers });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response text:', text.substring(0, 1000));
}

test();
