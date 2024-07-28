const { EmbedBuilder } = require("discord.js");

class chiEmbed extends EmbedBuilder {
  constructor() {
    super();
    this.setFooter({
      text: "takachi was here.",
      iconURL: "https://avatars.githubusercontent.com/u/109786377?v=4",
    });
    this.setColor("Random");
    this.setTimestamp();
  }

  /**
   * @param {GuildMember} member
   * @param {String} options
   * @param {String} [infoMsg=null]
   * @return {ModifiedEmbed}
   * @memberof ModifiedEmbed
   */
  embedTürü(member, options, infoMsg = null) {
    const colors = {
      error: 0xff5050,
      success: 0x57f287,
      qs: 0xff861c,
      info: 0x3498db,
    };

    if (!(options in colors)) {
      throw new Error("Geçersiz options değeri.");
    }

    this.data.color = colors[options];

    const titles = {
      error: "Error!",
      success: "Successful!",
      qs: "Are you sure?",
      info: infoMsg,
    };

    this.data.author = {
      name: `${member.displayName ? member.displayName :  member.globalName} » ${titles[options]}`,
      icon_url: member.displayAvatarURL({ dynamic: true }),
    };

    return this;
  }

  altBaşlık(text, iconURL) {
    return this.setFooter({
      text: text,
      iconURL: iconURL,
    });
  }

  üstBaşlık(name, iconURL, url) {
    return this.setAuthor({
      name: name,
      iconURL: iconURL,
      url: url,
    });
  }

  dosyaSet(name, value, inline) {
    if (
      typeof name !== "string" ||
      typeof value !== "string" ||
      typeof inline !== "boolean"
    ) {
      throw new Error("Invalid parameters for dosyaSet.");
    }
    return this.setFields([
      {
        name: name,
        value: value,
        inline: inline,
      },
    ]);
  }

  dosyaEkle(name, value, inline) {
    if (
      typeof name !== "string" ||
      typeof value !== "string" ||
      typeof inline !== "boolean"
    ) {
      throw new Error("Invalid parameters for dosyaEkle.");
    }
    return this.addFields([
      {
        name: name,
        value: value,
        inline: inline,
      },
    ]);
  }
}

exports.chiEmbed = chiEmbed;