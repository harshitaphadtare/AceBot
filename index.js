import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const discordToken = process.env.DISCORD_TOKEN;
const spamAPIkey = process.env.OOPSPAM_API_KEY;

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
]});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(discordToken);

//save it to github make sure to add gitignore