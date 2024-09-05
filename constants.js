/**
 * Tell the user that something is happening on the bot's side
 */
const ChatAction = {
    /**
     * `TYPING` for text messages.
     */
    TYPING: "typing",
    /**
     * `upload_photo` for photos.
     */
    UPLOAD_PHOTO: "upload_photo",
    /**
     * `record_video` or `upload_video` for videos.
     */
    RECORD_VIDEO: "record_video",
    /**
     * `record_video` or `upload_video` for videos.
     */
    UPLOAD_VIDEO: "upload_video",
    /**
     * `record_voice` or `upload_voice` for voice notes.
     */
    RECORD_VOICE: "record_voice",
    /**
     * `record_voice` or `upload_voice` for voice notes.
     */
    UPLOAD_VOICE: "upload_voice",
    /**
     * `upload_document` for general files.
     */
    UPLOAD_DOCUMENT: "upload_document",
    /**
     * `choose_sticker` for stickers.
     */
    CHOOSE_STICKER: "choose_sticker",
    /**
     * `find_location` for location data.
     */
    FIND_LOCATION: "find_location",
    /**
     * `record_video_note` or `upload_video_note` for video notes.
     */
    RECORD_VOICE_NOTE: "record_video_note",
    /**
     * `record_video_note` or `upload_video_note` for video notes.
     */
    UPLOAD_VOICE_NOTE: "upload_video_note"
};

/**
 * Parse mode determines how the text in messages is formatted.
 */
const ParseMode = {
    /**
     * Use HTML tags. Only the following are allowed: 
     * 
     * `b`, `i`, `code`, `pre`, `a href`, `s`, `del`, `u`, `span class="tg-spoiler"`, `tg-spoiler`, `tg-emoji emoji-id`, `pre code class="language-{language}"`, `blockquote`, `blockquote expandable`.
     * 
     * @see {@link https://core.telegram.org/bots/api#html-style|**Telegram Bot API**}
     */
    HTML: "HTML",
    /**
     * Use Markdown. Only the following are allowed:
     * 
     * - \*\*: bold
     * - _ _: italic
     * - [url]\(https://\): inline url
     * - \`\`: inline fixed-width code
     * - \`\`\` \`\`\`: pre-formatted fixed-width code (you can specify the language).
     * 
     * Note that escaping is __not__ allowed inside entities, so they must be opened and closed first.
     * @see {@link https://core.telegram.org/bots/api#markdown-style|**Telegram Bot API**}
     */
    Markdown: "Markdown",
    /**
     * Use Markdown V2. Only the following are allowed:
     * - \*\*: bold
     * - _ _: italic
     * - __ __: underline
     * - ~ ~: strikethrough
     * - || ||: spoiler
     * - [url]\(https://\): inline url
     * - ![emoji]\(tg://emoji?id=\): emoji
     * - \`\`: inline fixed-width code
     * - \`\`\` \`\`\`: pre-formatted fixed-width code (you can specify the language).
     * - \>: blockquote
     * - \*\*\> ||: expandable blockquote (end with double line, you can write on multiple lines with \>).
     * 
     * Any character with code between 1 and 126 in markdown V2 can be escaped with the \\ character.
     * 
     * @see {@link https://www.eso.org/~ndelmott/ascii.html|**ASCII Character Chart**}
     * @see {@link https://core.telegram.org/bots/api#markdownv2-style|**Telegram Bot API**}
     */
    MarkdownV2: "MarkdownV2"
};

/**
 * Message filters.
 */
const Filters = {
    /**
     * @param {String} TEXT - Represent a text message.
     */
    TEXT : 'text',
    /**
     * @param {String} ALL - Represent any kind of message.
     */
    ALL : 'all',
    /**
     * @param {String} PHOTO - Represent a message containing a photo.
     */
    PHOTO : 'photo',
    /**
     * @param {String} VIDEO - Represent a message containing a video.
     */
    VIDEO: 'video',
    /**
     * @param {String} DOCUMENT - Represent a message containing a document.
     */
    DOCUMENT: 'document',
};

/**
 * Message effect IDs that show up when the message is received.
 */
const MessageEffect = {
    /**
     * 🔥 Fire animation.
     */
    FIRE: "5104841245755180586",
    /**
     * 👍🏻 Thumbs up animation.
     */
    THUMBS_UP: "5107584321108051014",
    /**
     * ❤️ Hearts animation.
     */
    HEART: "5044134455711629726",
    /**
     * 🎉 Party animation.
     */
    PARTY: "5046509860389126442",
    /**
     * 👎🏻 Thumbs down animation.
     */
    THUMBS_DOWN: "5104858069142078462",
    /**
     * 💩 Poop animation.
     */
    POOP: "5046589136895476101"
}

export {
    ChatAction,
    ParseMode,
    MessageEffect,
    Filters
}