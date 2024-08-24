import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const discordToken = process.env.DISCORD_TOKEN;
const perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;

// Map to track user warnings
const userWarnings = new Map();
const rateLimit = {};
const muteDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Spam and toxicity detection using Perspective API
async function checkSpam(messageContent) {
  const apiKey = perspectiveApiKey;
  const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`;
  
  try {
    const response = await axios.post(url, {
      comment: { text: messageContent },
      requestedAttributes: { TOXICITY: {}, SPAM: {} }
    });

    const toxicityScore = response.data.attributeScores?.TOXICITY?.summaryScore?.value || 0;
    const spamScore = response.data.attributeScores?.SPAM?.summaryScore?.value || 0;

    return toxicityScore > 0.8 || spamScore > 0.75; 
  }
  catch (error) {
    console.error('Error checking spam:', error);
    return false; 
  }
}

// Handle incoming messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const now = Date.now();

  // Rate limiting
  if (!rateLimit[userId]) {
    rateLimit[userId] = now;
  } else if (now - rateLimit[userId] < 2000) { // 2 seconds threshold
    message.delete();
    await message.channel.send(`${message.author}, please slow down.`);
    return;
  }

  rateLimit[userId] = now;

  // Spam check
  const isSpam = await checkSpam(message.content);
  if (isSpam) {
    await message.delete();

    // Track the number of warnings
    const warnings = userWarnings.get(userId) || 0;

    switch (warnings) {
      case 0:
        await message.channel.send(`${message.author}, this is your **first warning**. Please refrain from posting spam or toxic messages.`);
        userWarnings.set(userId, warnings + 1);
        break;
      case 1:
        await message.channel.send(`${message.author}, **second warning**. 🚨 You're on thin ice!`);
        userWarnings.set(userId, warnings + 1);
        break;
      case 2:
        await message.channel.send(`${message.author}, **third and final warning**! 🚨🚨 One more strike and you're out!`);
        userWarnings.set(userId, warnings + 1);
        break;
      case 3:
        // Mute user
        await muteUser(message.guild, userId);
        userWarnings.set(userId, warnings + 1);
        await message.channel.send(`${message.author}, you have been muted for ${muteDuration / (60 * 1000)} minutes for repeated spam or toxic messages.`);
        break;
      case 4:
        // Ban user
        await banUser(message.guild, userId);
        userWarnings.delete(userId);
        await message.channel.send(`${message.author} has been **banned** from the server for repeated violations.`);
        break;
      default:
        break;
    }
  }
});

// Function to mute a user
async function muteUser(guild, userId) {
  const member = guild.members.cache.get(userId);
  if (member) {
    try {
      // Create a role for muting if it doesn't exist
      let muteRole = guild.roles.cache.find(role => role.name === 'Muted');
      if (!muteRole) {
        muteRole = await guild.roles.create({
          name: 'Muted',
          color: '#000000',
          permissions: [],
        });
        guild.channels.cache.forEach(async (channel) => {
          await channel.permissionOverwrites.edit(muteRole, {
            [PermissionsBitField.Flags.SendMessages]: false,
            [PermissionsBitField.Flags.AddReactions]: false,
          });
        });
      }

      await member.roles.add(muteRole);
      setTimeout(async () => {
        await member.roles.remove(muteRole);
      }, muteDuration);
    } catch (error) {
      console.error('Error muting user:', error);
    }
  }
}

// Function to ban a user
async function banUser(guild, userId) {
  const member = guild.members.cache.get(userId);
  if (member) {
    try {
      await member.ban({ reason: 'Exceeded warning limit for spam or toxic messages' });
    } catch (error) {
      console.error('Error banning user:', error);
    }
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(discordToken);
