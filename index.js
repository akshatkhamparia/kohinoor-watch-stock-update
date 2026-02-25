require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_IDS = process.env.CHAT_IDS.split(',');
const PRODUCT_URLS = [
  {
    name: 'PINK',
    url: 'https://www.hmtwatches.in/product_all_details?id=eyJpdiI6Im9IRzg3RnliNUMwclBHRkxHVVc1a1E9PSIsInZhbHVlIjoiRnBGTkh0YUprOGpTWk8rbExFNjhnQT09IiwibWFjIjoiNjU0MWM0MDI0MWI4YWU0MmUwYTRlOTdmZmU1YThjNjc3Y2MyN2RkZmE1YzhkNjdlYzVjOWM2ZDdmMWI1ZTE5ZCIsInRhZyI6IiJ9',
  },
  {
    name: 'MAROOOON',
    url: 'https://www.hmtwatches.in/product_all_details?id=eyJpdiI6IiszN0JRT0E5Vld5bmFyTnlIT0MwT1E9PSIsInZhbHVlIjoiYjdjSE5FUVJwNmNzZHpPaWVSYU1PUT09IiwibWFjIjoiYTFlYzUwZjczYjI2NzExZDAyMDI4NmFlMDBlNjk1NjA0MjU1OWE5OGEwOGU4ODdmZjQwYWMyMDFhNTE5NjVlNCIsInRhZyI6IiJ9',
  },
];
const PRODUCT_URLS2 = [
  {
    name: 'TEST1',
    url: 'https://www.hmtwatches.in/product_all_details?id=eyJpdiI6ImVmR2txTGRObmVXMFJObWxJVk1JWVE9PSIsInZhbHVlIjoiVnV5Ym1MeklxQmdZd1dGRTZ4b25CUT09IiwibWFjIjoiMzZjYmVmYzJiNTYyNDE1NzZiNDAxN2NkNzQ5OWQ1N2I1ZGUwOTZkOGQzZDQyYWZkNjliYTBmOWY5MDZlMjdiMyIsInRhZyI6IiJ9'
  },
];
// Track stock state per product
const productState = {};

// Store cron jobs per product
const productJobs = {};

async function sendMessage(text) {
  for (const chatId of CHAT_IDS) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId.trim(),
      text,
    });
  }
}

async function checkProduct(product) {
  try {
    console.log(`Checking ${product.name}...`);

    const response = await axios.get(product.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const $ = cheerio.load(response.data);

    const inStock = $('a.update_cart_product').length > 0;

    if (inStock) {
      if (!productState[product.url]) {
        await sendMessage(` ${product.name} Available!\n${product.url}`);
        productState[product.url] = true;
      }
    } else {
      if (productState[product.url]) {
        await sendMessage(` ${product.name} Out of Stock\n${product.url}`);
      }
      productState[product.url] = false;
    }
  } catch (error) {
    console.error(`Error checking ${product.name}:`, error.message);

    // If 404 → Stop cron for that product
    if (error.response && error.response.status === 404) {
      console.log(`Stopping cron for ${product.name} (404 detected)`);

      if (productJobs[product.url]) {
        productJobs[product.url].stop();
      }

      await sendMessage(` ${product.name} removed (404). Monitoring stopped.`);
      return;
    }

    // Other errors
    await sendMessage(`Error checking ${product.name}\n${error.message}`);
  }
}

console.log('Bot started...');

// Create separate cron job for each product
PRODUCT_URLS.forEach((product) => {
  const job = cron.schedule('*/2 * * * *', () => {
    checkProduct(product);
  });

  productJobs[product.url] = job;

  // Run immediately once
  checkProduct(product);
});
