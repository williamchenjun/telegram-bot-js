# 🤖 Telegram Bot API for JavaScript (NodeJS)
This module is very easy to use and to integrate to your JavaScript project. It is very straightforward to use and already has all the main classes and methods available to use. This module is still under development. It needs to be optimised and fully documented, but it is already functional. ([List of currently available methods](https://github.com/williamchenjun/telegram-bot-js/blob/main/README_Constants.md)).

**Note**: This module only supports webhooks. Thus, you will need a custom domain in order to use this module. You can easily set up one via `ngrok` or you can use other hosting services, such as Heroku.

## How to use
There are three available scripts `telegram-bot.js`, `constants.js` and `utils.js`. They are all used in conjuction. In fact, note that `telegram-bot.js` depends on `utils.js`, so make sure to not import it elsewhere to avoid circular imports.

- `telegram-bot.js` is the main script that contains all the different Telegram classes. You are going to use this module to create and build a `Bot` instance.
- `constants.js` contains some predefined constants that can be useful to keep your code neat and simple.
- `utils.js` is a utility module that you are probably not going to be using.

**Step by step**:
1. I will assume you already have NodeJS installed on your machine. Initialize a NodeJS project by running `npm init -y` (or configure it however you want).
2. All the modules used by `telegram-bot.js` are native to NodeJS, so there is no need to install anything.
3. Write your main script. For instance, if you use expressJS and ngrok:
```js
import { App } from "telegram-bot.js";
import { Filters } from "constants.js";
import express from "express";

const server = new express();
// It is recommended to store the API_KEY as an environment variable.
// To do so, install dotenv: npm i dotenv; then, create a .env file and store your environment variables inside of it.
// Note: If you plan to use git, create a .gitignore file and add .env so that your API_KEY and AUTH_TOKEN are secure and stay private!
const app = new App().token(API_KEY).build(); 

async function main(response){
  try {
    app.add_handler(new MessageHandler(Filters.TEXT, callback_function));
    await app.get_update(response);

    return new Response(new Blob(), {status: 200, statusText: "ok"});
  } catch (error){
    return new Response(new Blob(), {status: 404, statusText: "Error: " + error});
  }
}

server.post("/", async (request, response) => {
  try{
    await main(request.body);
    response.status(200).send("Ok");
  } catch (error) {
    response.status(404).send("Error: " + error);
  }
});

// Simple example of setting up a custom domain (randomly assigned) via ngrok. Visit their website for more information, or submit an issue.
// Initialize the express server and the ngrok webhook.
(async () => {
  // Choose a custom port number such as 8000.
  app.listen(PORT, async () => {
    console.log(`Server initialized on port ${PORT}`);

    await ngrok.connect({
      proto: "http",
      authtoken: AUTH_TOKEN, // You will receive an AUTH_TOKEN once you create an ngrok account. Store the token as an environment variable.
      addr: PORT,
      hostname: YOUR_CUSTOM_NGROK_DOMAIN // ngrok will always generate a random URL if you don't set this up. That is not ideal for Telegram bots. Thus, via your ngrok dashboard, set up a custom domain. You are free to set one up for free.
    }).then(async url => {
      // On success, it will return the ngrok endpoint. You can now use the setWebhook method from telegram-bot.js.

      try {
        let webhookInfo = app.get_webhook_info(); // Check if the webhook has already been set.
        if (webhookInfo.url == url){
          console.log("The webhook is already set.");
        } else {
          await tg.set_webhook(url);
          console.log("Webhook successfully set.");
        }
      } catch (error) {  
        throw new Error("Could not initialise server.");
      }
    });
    
  })
})();
```

> To install ngrok, you can just to their [official website](https://ngrok.com/download). Make sure to choose the correct binary. You should also install ngrok via npm `npm i ngrok`.

You're free to use whatever combination of modules or languages for your backend. You could conveniently use Flask or Django in python as well.

4. Now the only thing left to do is to host the files online. As I mentioned, you can use whatever method you find most convenient. If you have a home server, you could simply build a Docker container and host it on your server. Otherwise, there are plently of options online to host web apps, such as Heroku, Python Anywhere, etc..
5. That's it!
