require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const PRODUCT_URL = process.env.PRODUCT_URL;
const PRODUCT_URL_TEST = process.env.PRODUCT_URL_TEST;

let alreadyNotified = false;

async function checkProduct() {
  try {
    console.log('Checking product...');
    // const response = await axios.get(PRODUCT_URL, {
    const response = await axios.get(PRODUCT_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const $ = cheerio.load(response.data);

    const inStock = $('a.update_cart_product').length > 0;

    if (inStock) {
      console.log('Product is IN STOCK');

      if (!alreadyNotified) {
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          chat_id: CHAT_ID,
        //   text: `🔥 Product Available Test!\n${PRODUCT_URL}`,
          text: `🔥 Product Available!\n${PRODUCT_URL}`,
        });

        console.log('Telegram alert sent');
        alreadyNotified = true;
      }
    } else {
      console.log('Still out of stock');
      alreadyNotified = false; // reset so next stock triggers again
    }
  } catch (error) {
    console.error("Error:", error.message);
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `Error! \n${error.message}`,
    });
  }
}

console.log('Bot started...');

//Check every 2 minutes
cron.schedule("*/2 * * * *", () => {
  checkProduct();
});

// Run immediately once
checkProduct();

//------------------------------------------test bot-------------------------------------
// async function sendTest() {
//   await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//     chat_id: CHAT_ID,
//     text: "Bot is working!"
//   });

//   console.log("Message sent");
// }

// sendTest();
