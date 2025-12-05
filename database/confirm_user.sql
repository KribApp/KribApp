-- Replace 'YOUR_EMAIL' with the email address you used to register
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'YOUR_EMAIL';