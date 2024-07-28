const { Database } = require("vlodia");
const { Logger } = require("@vlodia/logger");
const {
  Client,
  Partials,
  GatewayIntentBits,
  Routes,
  REST,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  codeBlock,
  Guild
} = require("discord.js");
const { chiEmbed } = require("./libs/Embed");
const client = new Client({
  intents: Object.values(GatewayIntentBits),
  partials: Object.values(Partials),
});
const maintenanceModeKey = "maintenanceMode";
const db = new Database("./utils/database.json");
const logger = new Logger("[UPTIMEBOT]:");
const config = require("./utils/config.json");

const commandUsageTimes = new Map();

Guild.prototype.emojiGöster = function(x) {
  const e = client.emojis.cache.get(x) || client.emojis.cache.find(y => y.name === x);
  if(!e) {
    logger.info(`${e} isimli/idli emoji bulunamadı.`);
  };

  return e;
}


Client.prototype.emojiGöster = function(x) {
  const e = client.emojis.cache.get(x) || client.emojis.cache.find(y => y.name === x);
  if(!e) {
    logger.info(`${e} isimli/idli emoji bulunamadı.`);
  };

  return e;
}


const commands = [
  new SlashCommandBuilder()
    .setName("addlink")
    .setDescription("Add a link to track."),
  new SlashCommandBuilder()
    .setName("removelink")
    .setDescription("Remove a tracked link."),
  new SlashCommandBuilder()
    .setName("listlinks")
    .setDescription("List all tracked links."),
  new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Manage your premium membership.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to grant premium membership")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration of the premium membership")
        .setRequired(true)
        .addChoices(
          { name: "1 day", value: "1d" },
          { name: "1 week", value: "1w" },
          { name: "1 month", value: "1m" },
          { name: "1 year", value: "1y" },
          { name: "Unlimited", value: "unlimited" },
        ),
    ),
  new SlashCommandBuilder()
    .setName("premium-list")
    .setDescription("List all premium users."),
  new SlashCommandBuilder()
    .setName("premium-remove")
    .setDescription("Remove premium membership from a user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove premium membership from")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Execute JavaScript code.")
    .addStringOption((option) =>
      option
        .setName("code")
        .setDescription("The JavaScript code to execute.")
        .setRequired(true),
    ),
    new SlashCommandBuilder()
    .setName("close-maintenance")
    .setDescription("Disable maintenance mode."),
    new SlashCommandBuilder()
    .setName("open-maintenance")
    .setDescription("Enable maintenance mode."),
];

const rest = new REST({ version: "10" }).setToken(config.TOKEN);


(async () => {
  try {
    logger.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(config.clientID, config.serverID),
      { body: commands },
    );

    logger.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(error);
  }
})();

const enableMaintenanceMode = async (error) => {
  maintenanceMode = true;
  db.set(maintenanceModeKey, true, {
    pretty: true,
    write: true
  });

  const owner = await client.users.fetch(config.ownerID);
  await owner.send({
    embeds: [
      new chiEmbed()
        .setDescription(
          `Bot maintenance mode activated due to an error:\n\`\`\`js\n${error}\n\`\`\``,
        )
        .embedTürü(client.user, "error"),
    ],
  });

  client.guilds.cache.forEach(async (guild) => {
    const defaultChannel =
      guild.systemChannel ||
      guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
    if (defaultChannel) {
      await defaultChannel.send({
        embeds: [
          new chiEmbed()
            .setDescription(
              "The bot is currently under maintenance. No commands are available until further notice.",
            )
            .embedTürü(client.user, "error"),
        ],
      });
    }
  });
};

const disableMaintenanceMode = () => {
  client.guilds.cache.forEach(async (guild) => {
    const defaultChannel =
      guild.systemChannel ||
      guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
    if (defaultChannel) {
      await defaultChannel.send({
        embeds: [
          new chiEmbed()
            .setDescription("The bot is no longer in maintance mod.")
            .embedTürü(client.user, "success"),
        ],
      });
    }
  });
  maintenanceMode = false;
  db.set(maintenanceModeKey, false, {
    pretty: true,
    write: true
  });
};

const startMaintenanceMode = async () => {
  maintenanceMode = db.get(maintenanceModeKey) || false;
};

client.on("interactionCreate", async (interaction) => {
  if (
    !interaction.isCommand() &&
    !interaction.isModalSubmit() &&
    !interaction.isStringSelectMenu()
  )
    return;

  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsage = commandUsageTimes.get(userId);

  if (
    !interaction.member.permissions.has("Administrator") &&
    lastUsage &&
    now - lastUsage < 5000
  ) {
    return interaction.reply({
      content: "Please wait 5 seconds between commands.",
      ephemeral: true,
    });
  }

  commandUsageTimes.set(userId, now);

  if (interaction.isCommand()) {
    const { commandName } = interaction;
    
    if (require('./utils/database.json').maintenanceMode) {
      if (commandName !== "close-maintenance" && commandName !== "open-maintenance" && commandName !== "eval") {
        try {
          await interaction.reply({
            content: "The bot is currently in maintenance mode, please try again later.",
            ephemeral: true
          });
        } catch (error) {
          logger.error("Error responding to interaction:" + error );
        }
        return;
      }
    }
  

    const restartBot = () => {
      client.destroy();
      setTimeout(() => {
        client.login(config.TOKEN);
      }, 5000); // Small delay to ensure cleanup
    };
        
      if (commandName === 'close-maintenance') {
        if (interaction.user.id !== config.ownerID) {
          return interaction.reply({
            content: "Only the bot owner can use this command.",
            ephemeral: true,
          });
        }
        const maintenanceMode = db.get("maintenanceMode");
        if (!maintenanceMode) {
          return interaction.reply({
            content: "The bot is not in maintenance mode.",
            ephemeral: true,
          });
        }
    
        disableMaintenanceMode();
        try {
          await interaction.reply({
            content: "Maintenance mode has been disabled.",
            ephemeral: true,
          });
        } catch (error) {
          console.error("Error responding to interaction:", error);
        }
        restartBot();
      }
      if (commandName === 'open-maintenance') {
        if (interaction.user.id !== config.ownerID) {
          return interaction.reply({
            content: "Only the bot owner can use this command.",
            ephemeral: true,
          });
        }
        const maintenanceMode = db.get("maintenanceMode");
        if (maintenanceMode) {
          return interaction.reply({
            content: "The bot is already in maintenance mode.",
            ephemeral: true,
          });
        }
    
        enableMaintenanceMode();
        try {
          await interaction.reply({
            content: "Maintenance mode has been enabled.",
            ephemeral: true,
          });
        } catch (error) {
          console.error("Error responding to interaction:", error);
        }
        restartBot();
      }
    
    if (commandName === "addlink") {
      if (config.premium) {
        const userLinks = (db.get(`users.${interaction.user.id}`) || []).filter(
          (v, i, self) => self.indexOf(v) === i,
        );

        if (
          !db.get(`premium.${interaction.user.id}`) &&
          userLinks.length >= 5
        ) {
          return interaction.reply({
            content:
              "You already have 5 links in the database! If you want to add unlimited links, you have to buy premium.",
            ephemeral: true,
          });
        }
      }
      const modal = new ModalBuilder()
        .setCustomId("addlink-modal")
        .setTitle("Add Link");

      const linkInput = new TextInputBuilder()
        .setCustomId("linkInput")
        .setLabel("Enter the link to track")
        .setStyle(TextInputStyle.Short);

      const actionRow = new ActionRowBuilder().addComponents(linkInput);
      modal.addComponents(actionRow);
      await interaction.showModal(modal);
    } else if (commandName === "removelink") {
      const userLinks = (db.get(`users.${interaction.user.id}`) || []).filter(
        (v, i, self) => self.indexOf(v) === i,
      );

      if (userLinks.length === 0) {
        return interaction.reply({
          embeds: [
            new chiEmbed().embedTürü(
              interaction.member,
              "info",
              "You haven't added any links.",
            ),
          ],
          ephemeral: true,
        });
      }

      await interaction.reply({
        content: "Select the link you want to remove:",
        components: [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("removelink-select")
              .setPlaceholder("Select a link")
              .addOptions(
                userLinks.map((link) => ({
                  label: link,
                  value: link,
                })),
              ),
          ),
        ],
        ephemeral: true,
      });
    } else if (commandName === "eval") {
      if (interaction.user.id !== config.ownerID) {
        return interaction.reply({
          content: "You are not authorized to use this command.",
          ephemeral: true,
        });
      }

      const code = interaction.options.getString("code");

      try {
        const result = eval(code);
        return interaction.reply({
          content: `Result:\n\`\`\`js\n${result}\n\`\`\``,
          ephemeral: true,
        });
      } catch (error) {
        return interaction.reply({
          content: `Error:\n\`\`\`js\n${error}\n\`\`\``,
          ephemeral: true,
        });
      }
    } else if (commandName === "listlinks") {
      const userLinks = db.get(`users.${interaction.user.id}`) || [];
      if (userLinks.length === 0) {
        return interaction.reply({
          embeds: [
            new chiEmbed().embedTürü(
              interaction.member,
              "info",
              "You haven't added any links.",
            ),
          ],
          ephemeral: true,
        });
      }

      const embed = new chiEmbed().embedTürü(
        interaction.member,
        "info",
        "Here are your tracked links and their statuses.",
      );

      const linkStatusPromises = userLinks.map(async (link, index) => {
        try {
          const response = await fetch(link);
          return {
            name: `${index + 1} - ${link}`,
            value: response.ok
              ? `Active 🟢 ${response.status}`
              : `Inactive 🔴 ${response.status}`,
            inline: true,
          };
        } catch (error) {
          return {
            name: `${index + 1}. ${link}`,
            value: "Unreachable 🔴",
            inline: true,
          };
        }
      });

      const linkStatuses = await Promise.all(linkStatusPromises);

      linkStatuses.forEach((status) => {
        embed.dosyaEkle(status.name, status.value, status.inline);
      });

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } else if (commandName === "premium") {
      if (!config.premium)
        return interaction.reply({
          content: "Premium sistemi deaktif.",
          ephemeral: true,
        });
      const ownerId = config.ownerID;
      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: "Only the bot owner can use this command.",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user");
      const duration = interaction.options.getString("duration");

      let expirationDate = null;
      const now = new Date();
      switch (duration) {
        case "1d":
          expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "1w":
          expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "1m":
          expirationDate = new Date(now.setMonth(now.getMonth() + 1));
          break;
        case "1y":
          expirationDate = new Date(now.setFullYear(now.getFullYear() + 1));
          break;
        case "unlimited":
          expirationDate = "unlimited";
          break;
        default:
          return interaction.reply({
            content: "Invalid duration option.",
            ephemeral: true,
          });
      }

      interaction.reply({
        content: `${targetUser.tag} has been granted premium membership for ${duration}.`,
        ephemeral: true,
      });
      db.set(
        `premium.${targetUser.id}`,
        {
          expiration: expirationDate,
        },
        {
          pretty: true,
          write: true,
        },
      );
    } else if (commandName === "premium-list") {
      if (!config.premium)
        return interaction.reply({
          content: "Premium sistemi deaktif.",
          ephemeral: true,
        });
      const ownerId = config.ownerID;
      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: "Only the bot owner can use this command.",
          ephemeral: true,
        });
      }
      const premiumUsers = db.get("premium") || {};
      const embed = new chiEmbed().setDescription("Premium Users:");

      if (Object.keys(premiumUsers).length === 0) {
        return interaction.reply({
          content: "There are no premium users.",
          ephemeral: true,
        });
      }

      for (const userId in premiumUsers) {
        const userPremiumInfo = premiumUsers[userId];
        const expiration =
          userPremiumInfo.expiration === "unlimited"
            ? "Unlimited"
            : new Date(userPremiumInfo.expiration).toLocaleString();
        const user = await client.users.fetch(userId);
        embed.dosyaEkle(
          `${user.tag} - ${user.id}`,
          `Expiration: ${expiration}`,
          false,
        );
      }

      return interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    } else if (commandName === "premium-remove") {
      if (!config.premium)
        return interaction.reply({
          content: "Premium sistemi deaktif.",
          ephemeral: true,
        });
      const ownerId = config.ownerID;
      if (interaction.user.id !== ownerId) {
        return interaction.reply({
          content: "Only the bot owner can use this command.",
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getUser("user");

      const user = await client.user.fetch(targetUser.id);
      user.send({
        embeds: [
          new chiEmbed()
            .setDescription("Your premiumship has ben removed.")
            .setColor("Red"),
        ],
      });

      interaction.reply({
        content: `${targetUser.tag} no longer has premium membership.`,
        ephemeral: true,
      });

      db.delete(`premium.${targetUser.id}`, {
        pretty: true,
        write: true,
      });
    }
  } else if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId === "addlink-modal") {
      const link = interaction.fields.getTextInputValue("linkInput");

      let sanitizedLink = link.replace(/[^a-zA-Z0-9:/?&=.]/g, "");
      if (
        !sanitizedLink.startsWith("http://") &&
        !sanitizedLink.startsWith("https://")
      ) {
        sanitizedLink = `https://${sanitizedLink}`;
      }
      if (sanitizedLink.endsWith("/")) {
        sanitizedLink = sanitizedLink.slice(0, -1);
      }

      try {
        await fetch(sanitizedLink);
      } catch (error) {
        logger.error(`Link validation failed: ${sanitizedLink}`, error);
        return interaction.reply({
          embeds: [
            new chiEmbed()
              .setDescription(`The entered link is invalid or unreachable.`)
              .embedTürü(interaction.member, "error"),
          ],
          ephemeral: true,
        });
      }

      const userLinks = db.get(`users.${interaction.user.id}`) || [];

      const allLinks = db.get("allLinks") || {};
      const linkOwner = Object.keys(allLinks).find((ownerId) =>
        allLinks[ownerId].includes(sanitizedLink),
      );

      if (linkOwner && linkOwner !== interaction.user.id) {
        const ownerUser = await client.users.fetch(linkOwner);
        db.set(
          `stolenInfo.${linkOwner}-${ownerUser.tag}.id`,
          `${interaction.user.id}-${interaction.user.tag}`,
          {
            pretty: true,
            write: true,
          },
        );
        await ownerUser.send({
          embeds: [
            new chiEmbed()
              .setColor("Red")
              .setDescription(
                `Hello. The link ${sanitizedLink} was attempted to be added by someone else. Please contact support if this action is not legitimate.`,
              )
              .embedTürü(interaction.member, "error"),
          ],
          content: `${config.supportServer}`,
        });

        return interaction.reply({
          embeds: [
            new chiEmbed()
              .setDescription("Invalid link.")
              .embedTürü(interaction.member, "error"),
          ],
          ephemeral: true,
        });
      }

      if (userLinks.includes(sanitizedLink)) {
        return interaction.reply({
          embeds: [
            new chiEmbed()
              .setDescription("This link is already in the database.")
              .embedTürü(interaction.member, "error"),
          ],
          ephemeral: true,
        });
      }

      userLinks.push(sanitizedLink);
      db.set(`users.${interaction.user.id}`, userLinks, {
        pretty: true,
        write: true,
      });
      allLinks[interaction.user.id] = userLinks;
      db.set("allLinks", allLinks, {
        pretty: true,
        write: true,
      });

      interaction.reply({
        embeds: [
          new chiEmbed()
            .setDescription(
              `The link ${sanitizedLink} has been successfully added to the database`,
            )
            .embedTürü(interaction.member, "success"),
        ],
        ephemeral: true,
      });
    }
  } else if (interaction.isStringSelectMenu()) {
    const { customId, values } = interaction;

    if (customId === "removelink-select") {
      const linkToRemove = values[0];

      let userLinks = db.get(`users.${interaction.user.id}`) || [];
      userLinks = userLinks.filter((link) => link !== linkToRemove);
      db.set(`users.${interaction.user.id}`, userLinks, {
        pretty: true,
        write: true,
      });

      const allLinks = db.get("allLinks") || {};
      for (const [userId, links] of Object.entries(allLinks)) {
        allLinks[userId] = links.filter((link) => link !== linkToRemove);
      }
      db.set("allLinks", allLinks, {
        pretty: true,
        write: true,
      });

      interaction.reply({
        embeds: [
          new chiEmbed()
            .setDescription(`Link removed: ${linkToRemove}`)
            .embedTürü(interaction.member, "success"),
        ],
        ephemeral: true,
      });
    }
  } else if (customId === "premium-select") {
    const selectedOption = values[0];
    let duration;

    switch (selectedOption) {
      case "1d":
        duration = "1d";
        break;
      case "1w":
        duration = "7d";
        break;
      case "1m":
        duration = "30d";
        break;
      case "1y":
        duration = "365d";
        break;
      case "unlimited":
        duration = "unlimited";
        break;
    }

    const expiryDate =
      duration === "unlimited" ? null : Date.now() + ms(duration);
    db.set(
      `premium.${interaction.user.id}`,
      { expiryDate },
      {
        pretty: true,
        write: true,
      },
    );

    await interaction.reply({
      embeds: [
        new chiEmbed().embedTürü(
          interaction.member,
          "info",
          `You have been granted ${selectedOption} premium membership.`,
        ),
      ],
      ephemeral: true,
    });
  }
});

const checkPremiumMemberships = async () => {
  const now = new Date();
  const premiumUsers = db.get("premium") || {};

  for (const userId in premiumUsers) {
    const userPremiumInfo = premiumUsers[userId];

    if (
      userPremiumInfo.expiration !== "unlimited" &&
      new Date(userPremiumInfo.expiration) < now
    ) {
      db.delete(`premium.${userId}`);

      db.delete(`premium.${userId}`);

      db.delete(`users.${userId}`);

      const allLinks = db.get("allLinks") || {};
      delete allLinks[userId];
      db.set("allLinks", allLinks, {
        pretty: true,
        write: true,
      });

      const user = await client.users.fetch(userId);
      await user.send({
        embeds: [
          new chiEmbed()
            .setDescription("All links will be stop working.")
            .embedTürü(user, "info", "Your premium membership has expired."),
        ],
      });
    }
  }
};

client.on("interactionCreate", async (interaction) => {
  if (maintenanceMode) {
    return interaction.reply({
      content:
        "The bot is currently under maintenance. Please try again later.",
      ephemeral: true,
    });
  }
});



const fetchLinks = async (userId, links) => {
  for (const link of links) {
    try {
      await fetch(link);
    } catch (error) {
      logger.error(`Link check failed: ${link} ${error}`);
    }
  }
};

const checkWebsites = async () => {
  const users = db.get('users') || {};
  const premiumUsers = db.get('premium') || {};
  const allLinks = db.get('allLinks') || {};
  const startTime = Math.floor(Date.now() / 1000);
  const restartTime = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
  if (db.get('maintenanceMode')) {
    console.log("Maintenance mode is enabled. Skipping link checks.");
    return;
  }
  await client.channels.cache.get(config.uptimeStatus).send({
    embeds: [
      new chiEmbed()
        .setDescription(
          [
            `${codeBlock("Link's started to uptime.")}`,
            `> **${client.emojiGöster("astra_okey")} Bot Active!**`,
            `> **Library version: ${require('../package.json').dependencies["discord.js"]}**`,
            `> **Node Version: ${process.version}**`,
            `> **Started at: <t:${startTime}:R>**`,
            `> **Restart's at: <t:${restartTime}:R>**`
          ].join('\n\n')
        )
        .embedTürü(client.user, 'info', 'UpTime Started.')
    ]
  });

  const fetchPremiumLinks = async () => {
    for (const userId in premiumUsers) {
      const links = allLinks[userId] || [];
      await fetchLinks(userId, links);
    }
  };

  const fetchNonPremiumLinks = async () => {
    for (const userId in users) {
      if (!premiumUsers[userId]) { 
        const links = allLinks[userId] || [];
        await fetchLinks(userId, links);
      }
    }
  };

  await fetchPremiumLinks();
  await fetchNonPremiumLinks();
};

client.on("ready", async () => {
  console.log("Online.");
  await checkPremiumMemberships();
  await checkWebsites();
});


const premiumFetchInterval = 150000;
const nonPremiumFetchInterval = 300000; 

const fetchLinksForPremiumUsers = async () => {
  if (!db.get('maintenanceMode')) {
    await checkWebsites();
  }
};

const fetchLinksForNonPremiumUsers = async () => {
  if (!db.get('maintenanceMode')) {
    await checkWebsites();
  }
};

const getStatusMessages = () => {
  const totalLinks = Object.values(require('./utils/database.json').allLinks).reduce((sum, links) => sum + links.length, 0);
  return [
    `${totalLinks} Link's`,
    `${client.users.cache.size} User's`,
    `${client.guilds.cache.size} Server's`
  ];
};

let currentStatusIndex = 0;

const updateStatus = () => {
  const statuses = getStatusMessages();
  client.user.setPresence({
    activities: [{ name: statuses[currentStatusIndex] }],
    status: 'idle',
  });
  currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
};


setInterval(updateStatus, 30 * 1000);

setInterval(fetchLinksForPremiumUsers, premiumFetchInterval);
setInterval(fetchLinksForNonPremiumUsers, nonPremiumFetchInterval);

 
client.on("error", async (error) => {
  enableMaintenanceMode(error);
  startMaintenanceMode();
  logger.error(error);
});


client.login(config.TOKEN);
