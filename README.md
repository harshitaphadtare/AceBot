# AceBot- your Friendly Study Buddy

This Discord bot is designed to assist study groups by providing a variety of useful features such as spam detection, resource sharing, assignment reminders, and a Pomodoro timer. The bot is built using Node.js and Discord.js and integrates the Google’s Perspective API for spam detection.

## Features

- **Spam Detection and Control**: Automatically detect and remove spam messages using the Perspective Google API.
- **Resource Sharing**: Automatically share resources based on keywords and allow users to dynamically add new resources.
- **Assignment Reminders**: Set scheduled and custom reminders for assignments and tasks.
- **Pomodoro Timer**: Manage study sessions using the Pomodoro technique with default and custom durations.

## Installation

To install and set up the bot on your local machine, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/study-group-bot.git
   cd study-group-bot
   ```

2. Install the required dependencies:

   ```bash
   npm install discord.js dotenv axios node-schedule
   ```

3. Create your bot on the [Discord Developer Portal](https://discord.com/developers/applications):

   - Create a new application.
   - Add a bot to the application and copy the bot token.

4. Create a `.env` file in the root directory of your project and add the following variables:

   ```plaintext
   DISCORD_TOKEN=your-bot-token
   PERSPECTIVE_API_KEY=your-perspective-api-key
   ```

## Usage

1. Start the bot:

   ```bash
   node index.js
   ```

2. Interact with the bot using the following commands:

   - `!help` - Lists all available commands.
   - `!addresource <keyword> <link>` - Adds a new resource to the bot.
   - `!remindme <message> in <minutes/hours>` - Sets a reminder.
   - `!pomodoro <duration>` - Starts a Pomodoro timer.
   - `!feedback <message>` - Sends feedback to the admin.

## Example

- To add a resource for Python:

  ```
  !addresource python https://www.python.org/
  ```
- To get resource:

  ```
  share python resource
  ```

- To set a reminder:

  ```
  !remindme "Complete the assignment" in 5
  ```

- To start a 25-minute Pomodoro session:

  ```
  !pomodoro 25
  ```

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request. You can also open issues for any bugs or feature requests.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.