import {
  pipe, compose, composeRight,
  sprintf1,
} from 'stick-js/es'

const imgHero = (fbDomain) => fbDomain | sprintf1 ('https://%s/hero-fb.png')
const imgLogoAUP = (fbDomain) => fbDomain | sprintf1 ('https://%s/logo-aup.svg')
const style = `
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
    width: 130px;
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
`

export const getPasswordChangedEmail = (fbDomain, email, _) => [
  'Je wachtwoord is veranderd!',
  `Je wachtwoord voor het online FondsenBoek is zojuist veranderd.

Je gebruikersnaam is: ${email}

We tonen het nieuwe wachtwoord niet.

Als je het wachtwoord niet zelf hebt veranderd, neem dan direct contact op met onze support.

Vragen? Mail naar support@aup.nl.`,
  `<!DOCTYPE html>
<html>
<head>
  <style>
    ${style}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${imgHero (fbDomain)}" alt="Logo"/>
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
      <a href="https://aup.nl"><img src="${imgLogoAUP (fbDomain)}" alt="Logo"/></a>
      <p>&copy; 2024 Amsterdam University Press</p>
    </div>
  </div>
</body>
</html>
`]

export const getResetEmail = (fbDomain, _email, link) => [
  'Kies nieuw wachtwoord!',
  `Je krijgt deze mail omdat je hebt geklikt op wachtwoord vergeten in je account voor het online FondsenBoek.

Gebruik deze link om een wachtwoord te kiezen:

${link}

Als je dit niet hebt gedaan kun je dit bericht negeren.

Vragen? Mail naar support@aup.nl
  `,
  `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${style}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${imgHero (fbDomain)}" alt="Logo"/>
    </div>
    <div class="content">
      <h1>Kies nieuw wachtwoord!</h1>
      <p>Je krijgt deze mail omdat je hebt geklikt op <strong>wachtwoord vergeten</strong> in je account voor het online <em>FondsenBoek</em>.</p>
      <p>Klik op de knop hieronder om een wachtwoord te kiezen:</p>
      <p><a href="${link}" style="background-color: #164856; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Kies nieuw wachtwoord</a></p>
      <p>Als je dit niet hebt gedaan kun je dit bericht negeren</p>
      <p>Vragen? Mail naar <a style="color: #164856" href="mailto:support@aup.nl?&subject=FondsenBoekOnline">support@aup.nl</a></p>
    </div>
    <div class="footer">
      <a href="https://aup.nl"><img src="${imgLogoAUP (fbDomain)}" alt="Logo"/></a>
      <p>&copy; 2024 Amsterdam University Press</p>
    </div>
  </div>
</body>
</html>
`]

export const getWelcomeEmail = (fbDomain, _email, link) => [
  'Welkom bij het online FondsenBoek.',
  `Welkom bij het online FondsenBoek.

Gebruik deze link om je account te activeren:

${link}

Fijn dat je dit boek hebt gekocht. We hopen dat je er veel aan hebt.

Vragen? Mail naar support@aup.nl.
  `,
  `
<!DOCTYPE html>
<html>
<head>
  <style>
    ${style}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${imgHero (fbDomain)}" alt="Logo"/>
    </div>
    <div class="content">
      <h1>Welkom!</h1>
      <p>Welkom bij het online <em>FondsenBoek</em>.</p>
      <p>Klik op de knop hieronder om je account te activeren:</p>
      <p><a href="${link}" style="background-color: #164856; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Account activeren</a></p>
      <p>Fijn dat je dit boek hebt gekocht. We hopen dat je er veel aan hebt.</p>
      <p>Vragen? Mail naar <a style="color: #164856" href="mailto:support@aup.nl?&subject=FondsenBoekOnline">support@aup.nl</a></p>
    </div>
    <div class="footer">
      <a href="https://aup.nl"><img src="${imgLogoAUP (fbDomain)}" alt="Logo"/></a>
      <p>&copy; 2024 Amsterdam University Press</p>
    </div>
  </div>
</body>
</html>
  `
]
