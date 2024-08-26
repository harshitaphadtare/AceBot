import { Client, GatewayIntentBits, PermissionsBitField } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import schedule from 'node-schedule';

dotenv.config();

const discordToken = process.env.DISCORD_TOKEN;
const perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;
const resourceChannelId = process.env.RESOURCE_CHANNEL_ID;
const remindersChannelId = process.env.REMINDER_CHANNEL_ID;
const pomodoroChannelId = process.env.POMODORO_CHANNEL_ID; 

// Map to track user warnings
const userWarnings = new Map();
const rateLimit = {};
const muteDuration = 15 * 60 * 1000; // 15 minutes
const defaultPomodoro = 25 * 60 * 1000; // 25 minutes

const resources = {
  'python': 'https://www.python.org/',
  'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  'node.js': 'https://nodejs.org/',
  'react': 'https://reactjs.org/',
  'html': 'https://developer.mozilla.org/en-US/docs/Web/HTML',
  'css': 'https://developer.mozilla.org/en-US/docs/Web/CSS',
  'express': 'https://expressjs.com/',
  'mongodb': 'https://www.mongodb.com/',
  'git': 'https://git-scm.com/',
  'github': 'https://github.com/',
  'typescript': 'https://www.typescriptlang.org/',
  'docker': 'https://www.docker.com/',
  'aws': 'https://aws.amazon.com/'
};

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
  } catch (error) {
    console.error('Error checking spam:', error);
    return false; 
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const now = Date.now();

  // Keyword-based resource suggestion
  const messageContent = message.content.trim().toLowerCase();

  if (messageContent.startsWith('share ') && messageContent.endsWith(' resource')) {
    const keyword = messageContent.slice(6, -9).trim(); // Extract the keyword

    if (resources[keyword]) {
      message.channel.send(`Check out this resource: ${resources[keyword]}`);
    } else {
      message.channel.send(`No resource found for "${keyword}".`);
    }
  }

  // Dynamic Resource Addition
  if (message.content.startsWith('!addresource')) {
    const [_, keyword, ...linkParts] = message.content.split(' ');
    const link = linkParts.join(' ');

    if (!keyword || !link) {
      await message.channel.send(`Usage: !addresource <keyword> <link>\nExample: !addresource python https://www.python.org/`);
      return;
    }

    resources[keyword] = link;
    await client.channels.cache.get(resourceChannelId).send(`Resource added: ${keyword} - ${link}`);
    return; 
  }

  // Custom reminder
  if (message.content.startsWith('!remindme')) {
    const parts = message.content.split(' in ');
    if (parts.length < 2) {
      message.channel.send('Please specify the reminder and time.');
      return;
    }

    const reminderText = parts[0].replace('!remindme ', '');
    const timeString = parts[1];
    let delay;

    const timeMatch = timeString.match(/^(\d+)\s*(minute|minutes|hour|hours)$/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();

      if (unit.startsWith('minute')) {
        delay = value * 60 * 1000; // Convert minutes to milliseconds
      } else if (unit.startsWith('hour')) {
        delay = value * 60 * 60 * 1000; // Convert hours to milliseconds
      }

      message.channel.send(`OK! Your reminder is set for "${reminderText}" in ${value} ${unit}.`);

      const remindersChannel = client.channels.cache.get(remindersChannelId);

      if (!remindersChannel) {
        message.channel.send('Reminders channel not found.');
        return;
      }

      setTimeout(() => {
        remindersChannel.send(`Reminder for <@${message.author.id}>: ${reminderText}`);
      }, delay);
    } else {
      message.channel.send('Invalid time format. Please use minutes or hours.');
    }
  }

  // Pomodoro Timer


  // Help command
  if (message.content === '!help') {
    const helpMessage = `
    **🤖 Bot Commands Available:**
    
    1. **!addresource <keyword> <link>** 
      - **Description:** Add a new resource to the list. 
      - **Example:** \`!addresource python https://www.python.org/\`

    2. **!remindme <reminder> in <minutes>**  
      - **Description:** Set a reminder that will be sent to you via DM after a specified number of minutes. 
      - **Example:** \`!remindme Take a break in 10\`
    `;

    await message.channel.send(helpMessage);
    return; // Skip spam detection for this command
  }

  // Spam flooding detection
  if (!rateLimit[userId]) {
    rateLimit[userId] = now;
  } else if (now - rateLimit[userId] < 2000) { // 2 seconds threshold
    message.delete();
    await message.channel.send(`${message.author}, please slow down.`);
    return;
  }

  rateLimit[userId] = now;

  // Spam and toxicity detection
  const isSpam = await checkSpam(message.content);
  if (isSpam) {
    await message.delete();

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
        await muteUser(message.guild, userId);
        userWarnings.set(userId, warnings + 1);
        await message.channel.send(`${message.author}, you have been muted for ${muteDuration / (60 * 1000)} minutes for repeated spam or toxic messages.`);
        break;
      case 4:
        await banUser(message.guild, userId);
        userWarnings.delete(userId);
        await message.channel.send(`${message.author} has been **banned** from the server for repeated violations.`);
        break;
      default:
        break;
    }
  }
});

//schedule reminder 
function scheduleReminder(time, message) {
  schedule.scheduleJob(time, () => {
    client.channels.cache.get(remindersChannelId).send(message);
  });
}
scheduleReminder('0 9 * * *', 'Reminder: Check your assignments!');

// Function to mute a user
async function muteUser(guild, userId) {
  const member = guild.members.cache.get(userId);
  if (member) {
    try {
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
