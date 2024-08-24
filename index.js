import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import DiscordAntiSpam from 'discord-anti-spam';

dotenv.config();

const discordToken = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Spam Detection
const antiSpam = new DiscordAntiSpam({
    warnThreshold: 3,
    muteThreshold: 4,
    kickThreshold: 5,
    banThreshold: 7,
    maxInterval: 2000,
    warnMessage: '{@user}, please stop spamming.',
    muteMessage: '{@user} has been muted for spamming.',
    kickMessage: '{@user} has been kicked for spamming.',
    banMessage: '{@user} has been banned for spamming.',
    maxDuplicatesWarning: 3,
    maxDuplicatesKick: 5,
    maxDuplicatesBan: 7,
    exemptPermissions: ['ADMINISTRATOR'],
    ignoreBots: true,
    verbose: true,
    removeMessages: true
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Process spam detection
    antiSpam.message(message);

    // Notify user if their message is considered spam
    if (message.deletable) {
        message.reply('Your message has been flagged as spam. Please follow the rules.');
    }
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(discordToken);
