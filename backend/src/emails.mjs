import {
  pipe, compose, composeRight,
} from 'stick-js/es'

const imgHero = 'https://fondsenboek.com/hero-fb.png'
const imgLogoAUP = 'https://fondsenboek.com/logo-aup.png'

export const getPasswordChangedEmail = (email, _) => {
  return [
    'Je wachtwoord is veranderd!',
      'textversie',
      `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Open Sans, Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding: 10px;
        }
        .header img {
            width: 400px;
        }
        .footer img {
            width: 400px;
        }
        .content {
            padding: 20px;
            text-align: left;
        }
        .footer {
            text-align: center;
            padding: 10px;
            background-color: #f4f4f4;
        }
        .footer a {
            color: #0073e6;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${imgHero}" alt="Logo">
        </div>
        <div class="content">
            <h1>Je wachtwoord is veranderd!</h1>
            <p>Je wachtwoord voor het online <em>FondsenBoek</em> is zojuist veranderd.</p>
            <p>Uw gebruikersnaam is: ${email}</p>
            <p>We tonen het nieuwe wachtwoord niet. </p>
            <p>Als je het wachtwoord niet zelf hebt veranderd, neem dan direct contact op met onze <a style="color: #164856" href="mailto:support@aup.nl?&subject=FondsenBoekOnline">support</a>.</p>
            <p>Vragen? Mail naar <a style="color: #164856" href="mailto:support@aup.nl?&subject=FondsenBoekOnline">support@aup.nl</a></p>
        </div>
        <div class="footer">
            <a href="https://aup.nl"><img src="${imgLogoAUP}" alt="Logo"></a>
            <p>&copy; 2024 Amsterdam University Press</p>
        </div>
    </div>
</body>
</html>
  `]
}
