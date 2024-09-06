/* Functions that are related exclusively to Telegram bots. */
//@ts-nocheck
import {HTTP, Alert, waitForUpdate, filterObject, Objecty} from './utils.js';
import assert from "node:assert";
import fs from "node:fs";

let APIKEY, ENDPOINT;

/**
 * This object represents a handler for incoming callback queries.
 */
class CallbackQueryHandler {
    /**
     * @constructor
     * @param {Function} callback 
     */
    constructor(callback_function){
        this._callback_function = callback_function;
        this.update, this.bot;
    }

    get callback(){
        return new Promise((resolve) => {
            this.bot.answerCallbackQuery({callback_query_id: this.update.callback_query.id})
            .then(response => {
                this._callback_function(this.update, this.bot);
                resolve(response);
            });
        });
    }

    /**
     * @param {{update: Update, bot: Bot}} config Configuration object.
     */
    set callback(config){
        this.update = config.update;
        this.bot = config.bot;
    }
}

/**
 * This object represents a handler for conversations with users.
 */
class ConversationHandler {
    /**
     * @constructor
     * @param {{entry_points: Array, states: {}, fallbacks: Array}} config 
     */
    constructor(config) {
        this.entryPoints = config.entry_points;
        this.states = config.states;
        this.fallbacks = config.fallbacks || [];
        this.conversations = {};
    }

    async __asyncCallback() {
        if (this.update === null || this.bot === null){return;}

        const chatId = this.update.message.chat.id;

        const state = this.conversations[chatId] !== undefined ? this.conversations[chatId] : 'entry';

        const handlers = state === 'entry' ? this.entryPoints : this.states[state];


        for (let handler of handlers) {
            if (this.checkHandler(handler, this.update)) {
                const nextState = await handler._callback_function(this.update, this.bot);
                if (nextState === ConversationHandler.END) {
                    delete this.conversations[chatId];
                } else {
                    this.conversations[chatId] = nextState;
                }
                return true;
            }
        }

        for (let handler of this.fallbacks) {
            if (this.checkHandler(handler, this.update)) {
                await handler._callback_function(this.update, this.bot);
                return true;
            }
        }

        return false;
    }

    get callback() {
        return new Promise((resolve, reject) => {
            this.__asyncCallback().then(result => {
                resolve(result);
            });
        });
    }

    /**
     * @param {{update: Update, bot: Bot}} config Configuration object.
     */
    set callback(config) {
        this.update = config.update;
        this.bot = config.bot;
    }

    checkHandler(handler, update) {
        if (handler instanceof CommandHandler) {
            const regex = new RegExp(`^\\/${handler.command}\\b`);
            return regex.test(update.message.text);
        } else if (handler instanceof MessageHandler) {
            return handler.filter.some(filter => this.matchesFilter(filter, update));
        }
        return false;
    }

    matchesFilter(filter, update) {
        switch (filter) {
            case "text":
                return typeof update.message.text === 'string';
            case "photo":
                return update.message.photo !== undefined;
            case "video":
                return update.message.video !== undefined;
            case "document":
                return update.message.document !== undefined;
            case "all":
                return update.message !== null;
            default:
                return false;
        }
    }

    static get END() {
        return -1;
    }
}

/**
 * This object represents a handler for messages.
 */
class MessageHandler {
    /**
     * @constructor
     * @param {Array<String>|String} filter 
     * @param {Function} callback_function 
     */
    constructor(filter, callback_function){
        assert(!Object.keys(Filters).includes(filter), "Invalid filter.");
        this.filter = filter instanceof Array? filter.map(f => f.toLowerCase()) : [filter.toLowerCase()];
        this._callback_function = callback_function;
        this.update, this.bot;
    }
    
    get callback(){
        if (this.update !== null && this.bot !== null && this.update.message !== null){
            for (const filter of this.filter){
                switch(filter){
                    case "text":
                        if (this.update.message.text instanceof String){
                            return this._callback_function(this.update, this.bot);
                        }
                        break;
                    case "photo":
                        if (this.update.message.photo !== null){
                            return this._callback_function(this.update, this.bot);
                        }
                        break;
                    case "video":
                        if (this.update.message.video !== null){
                            return this._callback_function(this.update, this.bot);
                        }
                        break;
                    case "document":
                        if (this.update.message.document !== null){
                            return this._callback_function(this.update, this.bot);
                        }
                        break;
                    case "all":
                        if (this.update.message !== null){
                            return this._callback_function(this.update, this.bot);
                        }
                        break;
                    default:
                        console.log("Invalid filter.");
                        break;
                }
            }
            
        }
    }
    
    /**
     * @param {{update: Update, bot: Bot}} config Configuration object.
     */
    set callback(config){
        this.update = config.update;
        this.bot = config.bot;
    }
}

/**
 * This object represents a handler for commands.
 */
class CommandHandler {
/**
 * @constructor
 * @param {String} command 
 * @param {Function} callback_function 
 */
constructor(command, callback_function){
    this.command = command;
    this._callback_function = callback_function;
    this.update, this.bot;
}

get callback(){
    if (this.update !== null && this.bot !== null && this.update.message !== null){
        const regex = new RegExp(`^\\/${this.command}\\b`);
        if (regex.test(this.update.message.text)){
            return this._callback_function(this.update, this.bot);
        }
    }
}

/**
 * @param {{update: Update, bot: Bot}} config Configuration object.
 */
set callback(config){
    this.update = config.update;
    this.bot = config.bot;
}
}

/**
 * This object represents the contents of a file to be uploaded. Must be posted using `multipart/form-data` in the usual way that files are uploaded via the browser.
 */
class InputFile {
    constructor(path){
        this.input_file = fs.createReadStream(path);
    }

    toJSON(){
        return JSON.stringify({
            document: this.input_file
        });
    }
}

/**
 * Represents an animation file (GIF or H.264/MPEG-4 AVC video without sound) to be sent.
 */
class InputMediaAnimation {
    /**
     * 
     * @param {{type: "animation", media: string, thumbnail: InputFile|string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, show_caption_above_media: boolean, width: number, height: number, duration: number, has_spoiler: boolean}} input_media 
     */
    constructor(input_media) {
        this.input_media = input_media;
    }
    /**
     * Type of the result, must be `animation`.
     * @returns {string}
     */
    get type(){return this.input_media.type;}
    /**
     * File to send. Pass a `file_id` to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass `"attach://<file_attach_name>""` to upload a new one using `multipart/form-data` under `<file_attach_name>` name.
     * @returns {string}
     */
    get media(){return this.input_media.media;}
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail's width and height should not exceed 320. Ignored if the file is not uploaded using `multipart/form-data`. Thumbnails can't be reused and can be only uploaded as a new file, so you can pass `"attach://<file_attach_name>"` if the thumbnail was uploaded using `multipart/form-data` under `<file_attach_name>`.
     * @returns {InputFile|string}
     */
    get thumbnail(){return this.input_media.hasOwnProperty("thumbnail")?this.input_media.thumbnail:null;}
    /**
     * Caption of the animation to be sent, 0-1024 characters after entities parsing.
     * @returns {string}
     */
    get caption(){return this.input_media.hasOwnProperty("caption")?this.input_media.caption:null;}
    /**
     * Mode for parsing entities in the animation caption.
     * @returns {string}
     */
    get parse_mode(){return this.input_media.hasOwnProperty("parse_mode")?this.input_media.parse_mode:null;}
    /**
     * List of special entities that appear in the caption, which can be specified instead of parse_mode.
     * @returns {Array<MessageEntity>}
     */
    get caption_entities(){return this.input_media.hasOwnProperty("caption_entities")?this.input_media.caption_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * Pass `True`, if the caption must be shown above the message media.
     * @returns {boolean}
     */
    get show_caption_above_media(){return this.input_media.hasOwnProperty("show_caption_above_media")?this.input_media.show_caption_above_media:null;}
    /**
     * Animation width.
     * @returns {number}
     */
    get width(){return this.input_media.hasOwnProperty("width")?this.input_media.width:null;}
    /**
     * Animation height.
     * @returns {number}
     */
    get height(){return this.input_media.hasOwnProperty("height")?this.input_media.height:null;}
    /**
     * Animation duration in seconds.
     * @returns {number}
     */
    get duration(){return this.input_media.hasOwnProperty("duration")?this.input_media.duration:null;}
    /**
     * Pass `True` if the animation needs to be covered with a spoiler animation.
     * @returns {boolean}
     */
    get has_spoiler(){return this.input_media.hasOwnProperty("has_spoiler")?this.input_media.has_spoiler:null;}
    
    
    toJSON(){
        let obj = {};
        for (const [key, val] of Object.entries(this.input_media)){
            obj[key] = val;
        }
        return JSON.stringify(obj);
    }
}

/**
 * Represents a general file to be sent.
 */
class InputMediaDocument {
    /**
     * 
     * @param {{type: "document", media: string, thumbnail: InputFile|string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, disable_content_type_detection: boolean}} input_media 
     */
    constructor(input_media) {
        this.input_media = input_media;
    }
    /**
     * Type of the result, must be `document`.
     * @returns {string}
     */
    get type(){return this.input_media.type;}
    /**
     * File to send. Pass a `file_id` to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass `"attach://<file_attach_name>""` to upload a new one using `multipart/form-data` under `<file_attach_name>` name.
     * @returns {string}
     */
    get media(){return this.input_media.media;}
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail's width and height should not exceed 320. Ignored if the file is not uploaded using `multipart/form-data`. Thumbnails can't be reused and can be only uploaded as a new file, so you can pass `"attach://<file_attach_name>"` if the thumbnail was uploaded using `multipart/form-data` under `<file_attach_name>`.
     * @returns {InputFile|string}
     */
    get thumbnail(){return this.input_media.hasOwnProperty("thumbnail")?this.input_media.thumbnail:null;}
    /**
     * Caption of the animation to be sent, 0-1024 characters after entities parsing.
     * @returns {string}
     */
    get caption(){return this.input_media.hasOwnProperty("caption")?this.input_media.caption:null;}
    /**
     * Mode for parsing entities in the animation caption.
     * @returns {string}
     */
    get parse_mode(){return this.input_media.hasOwnProperty("parse_mode")?this.input_media.parse_mode:null;}
    /**
     * List of special entities that appear in the caption, which can be specified instead of parse_mode.
     * @returns {Array<MessageEntity>}
     */
    get caption_entities(){return this.input_media.hasOwnProperty("caption_entities")?this.input_media.caption_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * Disables automatic server-side content type detection for files uploaded using `multipart/form-data`. Always `True`, if the document is sent as part of an album.
     * @returns {boolean}
     */
    get disable_content_type_detection(){return this.input_media.hasOwnProperty("disable_content_type_detection")?this.input_media.disable_content_type_detection:null;}
    
    
    toJSON(){
        let obj = {};
        for (const [key, val] of Object.entries(this.input_media)){
            obj[key] = val;
        }
        return JSON.stringify(obj);
    }
}

/**
 * Represents an audio file to be treated as music to be sent.
 */
class InputMediaAudio {
    /**
     * 
     * @param {{type: "audio", media: string, thumbnail: InputFile|string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, duration: number, performer: string, title: string}} input_media 
     */
    constructor(input_media) {
        this.input_media = input_media;
    }
    /**
     * Type of the result, must be `audio`.
     * @returns {string}
     */
    get type(){return this.input_media.type;}
    /**
     * File to send. Pass a `file_id` to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass `"attach://<file_attach_name>""` to upload a new one using `multipart/form-data` under `<file_attach_name>` name.
     * @returns {string}
     */
    get media(){return this.input_media.media;}
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail's width and height should not exceed 320. Ignored if the file is not uploaded using `multipart/form-data`. Thumbnails can't be reused and can be only uploaded as a new file, so you can pass `"attach://<file_attach_name>"` if the thumbnail was uploaded using `multipart/form-data` under `<file_attach_name>`.
     * @returns {InputFile|string}
     */
    get thumbnail(){return this.input_media.hasOwnProperty("thumbnail")?this.input_media.thumbnail:null;}
    /**
     * Caption of the animation to be sent, 0-1024 characters after entities parsing.
     * @returns {string}
     */
    get caption(){return this.input_media.hasOwnProperty("caption")?this.input_media.caption:null;}
    /**
     * Mode for parsing entities in the animation caption.
     * @returns {string}
     */
    get parse_mode(){return this.input_media.hasOwnProperty("parse_mode")?this.input_media.parse_mode:null;}
    /**
     * List of special entities that appear in the caption, which can be specified instead of parse_mode.
     * @returns {Array<MessageEntity>}
     */
    get caption_entities(){return this.input_media.hasOwnProperty("caption_entities")?this.input_media.caption_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * Duration of the audio in seconds.
     * @returns {number}
     */
    get duration(){return this.input_media.hasOwnProperty("duration")?this.input_media.duration:null;}
    /**
     * Performer of the audio.
     * @returns {string}
     */
    get performer(){return this.input_media.hasOwnProperty("perfomer")?this.input_media.perfomer:null;}
    /**
     * Title of the audio.
     * @returns {string}
     */
    get title(){return this.input_media.hasOwnProperty("title")?this.input_media.title:null;}

    toJSON(){
        let obj = {};
        for (const [key, val] of Object.entries(this.input_media)){
            obj[key] = val;
        }
        return JSON.stringify(obj);
    }
}

/**
 * Represents a photo to be sent.
 */
class InputMediaPhoto {
    /**
     * 
     * @param {{type: "photo", media: string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, show_caption_above_media: boolean, has_spoiler: boolean}} input_media 
     */
    constructor(input_media) {
        this.input_media = input_media;
    }
    /**
     * Type of the result, must be `photo`.
     * @returns {string}
     */
    get type(){return this.input_media.type;}
    /**
     * File to send. Pass a `file_id` to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass `"attach://<file_attach_name>""` to upload a new one using `multipart/form-data` under `<file_attach_name>` name.
     * @returns {string}
     */
    get media(){return this.input_media.media;}
    /**
     * Caption of the animation to be sent, 0-1024 characters after entities parsing.
     * @returns {string}
     */
    get caption(){return this.input_media.hasOwnProperty("caption")?this.input_media.caption:null;}
    /**
     * Mode for parsing entities in the animation caption.
     * @returns {string}
     */
    get parse_mode(){return this.input_media.hasOwnProperty("parse_mode")?this.input_media.parse_mode:null;}
    /**
     * List of special entities that appear in the caption, which can be specified instead of parse_mode.
     * @returns {Array<MessageEntity>}
     */
    get caption_entities(){return this.input_media.hasOwnProperty("caption_entities")?this.input_media.caption_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * Pass `True`, if the caption must be shown above the message media.
     * @returns {boolean}
     */
    get show_caption_above_media(){return this.input_media.hasOwnProperty("show_caption_above_media")?this.input_media.show_caption_above_media:null;}
    /**
     * Pass `True`, if the photo needs to be covered with a spoiler animation.
     * @returns {boolean}
     */
    get has_spoiler(){return this.input_media.hasOwnProperty("has_spoiler")?this.input_media.has_spoiler:null;}


    toJSON(){
        let obj = {};
        for (const [key, val] of Object.entries(this.input_media)){
            obj[key] = val;
        }
        return JSON.stringify(obj);
    }
}

/**
 * Represents a video to be sent.
 */
class InputMediaVideo {
    /**
     * 
     * @param {{type: "video", media: string, thumbnail: InputFile|string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, show_caption_above_media: boolean, width: number, height: number, duration: number, supports_streaming: boolean, has_spoiler: boolean}} input_media 
     */
    constructor(input_media) {
        this.input_media = input_media;
    }
    /**
     * Type of the result, must be `video`.
     * @returns {string}
     */
    get type(){return this.input_media.type;}
    /**
     * File to send. Pass a `file_id` to send a file that exists on the Telegram servers (recommended), pass an HTTP URL for Telegram to get a file from the Internet, or pass `"attach://<file_attach_name>""` to upload a new one using `multipart/form-data` under `<file_attach_name>` name.
     * @returns {string}
     */
    get media(){return this.input_media.media;}
    /**
     * Thumbnail of the file sent; can be ignored if thumbnail generation for the file is supported server-side. The thumbnail should be in JPEG format and less than 200 kB in size. A thumbnail's width and height should not exceed 320. Ignored if the file is not uploaded using `multipart/form-data`. Thumbnails can't be reused and can be only uploaded as a new file, so you can pass `"attach://<file_attach_name>"` if the thumbnail was uploaded using `multipart/form-data` under `<file_attach_name>`.
     * @returns {InputFile|string}
     */
    get thumbnail(){return this.input_media.hasOwnProperty("thumbnail")?this.input_media.thumbnail:null;}
    /**
     * Caption of the animation to be sent, 0-1024 characters after entities parsing.
     * @returns {string}
     */
    get caption(){return this.input_media.hasOwnProperty("caption")?this.input_media.caption:null;}
    /**
     * Mode for parsing entities in the animation caption.
     * @returns {string}
     */
    get parse_mode(){return this.input_media.hasOwnProperty("parse_mode")?this.input_media.parse_mode:null;}
    /**
     * List of special entities that appear in the caption, which can be specified instead of parse_mode.
     * @returns {Array<MessageEntity>}
     */
    get caption_entities(){return this.input_media.hasOwnProperty("caption_entities")?this.input_media.caption_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * Pass `True`, if the caption must be shown above the message media.
     * @returns {boolean}
     */
    get show_caption_above_media(){return this.input_media.hasOwnProperty("show_caption_above_media")?this.input_media.show_caption_above_media:null;}
    /**
     * Video width.
     * @returns {number}
     */
    get width(){return this.input_media.hasOwnProperty("width")?this.input_media.width:null;}
    /**
     * Video height.
     * @returns {number}
     */
    get height(){return this.input_media.hasOwnProperty("height")?this.input_media.height:null;}
    /**
     * Video duration in seconds.
     * @returns {number}
     */
    get duration(){return this.input_media.hasOwnProperty("duration")?this.input_media.duration:null;}
    /**
     * Pass True if the uploaded video is suitable for streaming.
     * @returns {boolean}
     */
    get supports_streaming(){return this.input_media.hasOwnProperty("supports_streaming")?this.input_media.supports_streaming:null;}
    /**
     * Pass `True`, if the photo needs to be covered with a spoiler animation.
     * @returns {boolean}
     */
    get has_spoiler(){return this.input_media.hasOwnProperty("has_spoiler")?this.input_media.has_spoiler:null;}


    toJSON(){
        let obj = {};
        for (const [key, val] of Object.entries(this.input_media)){
            obj[key] = val;
        }
        return JSON.stringify(obj);
    }
}

/**
 * This object represents a Telegram instance.
 */
class App {
/**
 * @constructor
 */
constructor(){
    this._API_KEY;
    this._bot;
    this._update;
    this.handlers = {};
    this.handler_types = [
        "command_handlers", 
        "message_handlers", 
        "conversation_handlers", 
        "callback_query_handlers"
    ];
    this.last_update_id = null;
}

/**
 * @returns {String} Telegram API token.
 */
get API_KEY(){
    return this._API_KEY;
}

set API_KEY(value){
    this._API_KEY = value;
}

/**
 * @returns {Bot} The bot instance.
 */
get bot(){
    return this._bot;
}

/**
 * @returns {Update} The update instance.
 */
get update(){
    return this._update;
}

token(api_key) {
    this.API_KEY = api_key;
    return this;
}

build(){
    this._bot = new Bot(this.API_KEY);
    for (const handler_type of this.handler_types){
        this.handlers[handler_type] = {};
    }
    return this;
}

/**
 * This method assigns a handler to the `App` instance for incoming `Update`.
 * @param {CommandHandler|MessageHandler|ConversationHandler|CallbackQueryHandler} handler - The update handler.
 * @returns 
 */
add_handler(handler){
    if (handler instanceof CommandHandler){
        let idx = Object.keys(this.handlers["command_handlers"]).length;
        let commands = Object.values(this.handlers["command_handlers"]).map(obj => obj.command);
        if (commands.includes(handler.command)){return;}
        this.handlers["command_handlers"][idx] = {
            handlerClass: handler,
            command: handler.command,
            require: "message",
            callback: (up) => {handler.callback = {update: up, bot: this._bot};}
        };
    } else if (handler instanceof MessageHandler){
        let idx = Object.keys(this.handlers["message_handlers"]).length;
        let filters = Object.values(this.handlers["message_handlers"]).map(obj => obj.filter).flat();
        if (handler.filter.filter(x => filters.includes(x)).length > 0){return;}
        this.handlers["message_handlers"][idx] = {
            handlerClass: handler,
            filter: handler.filter,
            require: "message",
            callback: (up) => {handler.callback = {update: up, bot: this._bot};}
        };
    } else if (handler instanceof ConversationHandler) {
        let idx = Object.keys(this.handlers["conversation_handlers"]).length;
        if (idx > 0){return;}
        this.handlers["conversation_handlers"][idx] = {
            handlerClass: handler,
            require: "message",
            callback: (up) => { handler.callback = { update: up, bot: this._bot }; }
        };
    } else if (handler instanceof CallbackQueryHandler) {
        let idx = Object.keys(this.handlers["callback_query_handlers"]).length;
        if (idx > 0){return;}
        this.handlers["callback_query_handlers"][idx] = {
            handlerClass: handler,
            require: "callback_query",
            callback: (up) => { handler.callback = { update: up, bot: this._bot }; }
        };
    }
    
    return this;
}

/**
 * Incoming update propagation.
 */
async get_update(update){
    this._update = new Update(update);

    if (this._update.update_id === this.last_update_id){
        return;
    } else {
        this.last_update_id = this._update.update_id;
    }

    // this deals with the flow of the handlers and messages
    for (const handler_type of Object.keys(this.handlers)){
        for (const handler of Object.values(this.handlers[handler_type])){
            if (update.hasOwnProperty(handler.require)){
                handler.callback(this._update);
                await handler.handlerClass.callback;
            }
        }
    }
}

/**
 * Use this method to specify a URL and receive incoming updates via an outgoing webhook. 
 * @param {String} url The webhook URL.
 * @returns {Boolean|Error} If the webhook has been sucessfully set, it will return `true`. Otherwise, it will throw an error.
 */
async set_webhook(url){
    let config = HTTP("setWebhook", {url: url, drop_pending_updates: true});
    const response = await fetch(ENDPOINT, config);
    const data = await response.json();

    if (response.ok && data.url != ''){
        return true;
    }

    throw new Error("Failed to set the webhook:", data);
}

/**
 * Use this method to remove webhook integration if you decide to switch back to `getUpdates`.
 * @returns {Boolean|Error} If the webhook has been sucessfully deleted, it will return `true`. Otherwise, it will throw an error.
 */
async delete_webhook(){

    let config = HTTP("deleteWebhook", {});
    const response = await fetch(ENDPOINT, config);

    if (response.ok){
        return true;
    }

    throw new Error("Failed to delete the webhook.");
}

/**
 * Use this method to get current webhook status.
 * @returns {WebhookInfo|boolean} On success, returns a `WebhookInfo` object. Otherwise, it will return `false`.
 */
async get_webhook_info(){
    let config = HTTP("getWebhookInfo", {});
    const response = await fetch(ENDPOINT, config);
    const data = await response.json();

    if (response.ok){
        return new WebhookInfo(data);
    } else {
        console.warn("No webhook information:", data);
        return false;
    }
}

}

/**
 * This object represents a bot instance.
 */
class Bot {
/**
 * @constructor
 * @param {string} API_KEY - Bot API key.
 */
constructor(API_KEY){
    this.API_KEY = API_KEY;
    APIKEY = API_KEY;
    ENDPOINT = `https://api.telegram.org/bot${APIKEY}/`;
    this._args = [];
    /**
     * An object (`utils.Objecty`) accessible in the `Bot` scope to store user data as key-value pairs.
     * @example
     * Bot.user_data["message_id"] = update.message.message_id;
     * const message_id = Bot.user_data["message_id"];
     */
    this.user_data = new Objecty({});
    this.endpoint = `https://api.telegram.org/bot${API_KEY}/`;
}
    /**
     * Use this method to send text messages. On success, the sent `Message` is returned.
     * @param {{chat_id: number|String, text: String, parse_mode: String, link_preview_options: LinkPreviewOptions|{is_disabled: Boolean, url: String, prefer_small_media: Boolean, prefer_large_media: Boolean, show_above_text: Boolean}, disable_notification: Boolean, protect_content: Boolean, message_effect_id: String, reply_parameters: ReplyParameters|Object, reply_markup: InlineKeyboardMarkup|Object}} config 
     * @returns {Promise<Message>}
     */
    async sendMessage(config){
        let params = HTTP("sendMessage", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        return new Message(response.result);
    }

    /**
     * Use this method to delete a message, including service messages, with the following limitations:
    - A message can only be deleted if it was sent less than 48 hours ago.
    - Service messages about a supergroup, channel, or forum topic creation can't be deleted.
    - A dice message in a private chat can only be deleted if it was sent more than 24 hours ago.
    - Bots can delete outgoing messages in private chats, groups, and supergroups.
    - Bots can delete incoming messages in private chats.
    - Bots granted `can_post_messages` permissions can delete outgoing messages in channels.
    - If the bot is an administrator of a group, it can delete any message there.
    - If the bot has can_delete_messages permission in a supergroup or a channel, it can delete any message there.

    Returns `True` on success.
     * @param {{chat_id: number|string, message_id: number}} config 
     * @returns {boolean}
     */
    async deleteMessage(config){
        let params = HTTP("deleteMessage", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        return response.result;
    }

    /**
     * Use this method to send general files. On success, the sent `Message` is returned. Bots can currently send files of any type of up to 50 MB in size, this limit may be changed in the future.
     * @param {{chat_id: number|string, document: InputFile|string, thumbnail: InputFile|string, caption:string, parse_mode: string, disable_content_type_detection:boolean, disable_notification: boolean, protect_content: boolean, message_effect_id: string, reply_parameters: ReplyParameters, reply_markup: InlineKeyboardMarkup}} config 
     * @returns {Promise<Message>}
     */
    async sendDocument(config){
        const formdata = new FormData();
        formdata.append("method", "sendDocument");
        for (const [key, val] of Object.entries(config)){
            formdata.append(key, val);
        }
        const response = await fetch(this.endpoint, {
            method: "POST",
            body: formdata
        })
        .then(resp => resp.json());
        return new Message(response.result);
    }

    /**
     * Use this method to get basic information about a file and prepare it for downloading. For the moment, bots can download files of up to 20MB in size. On success, a `File` object is returned. The file can then be downloaded via the link `https://api.telegram.org/file/bot<token>/<file_path>`, where `<file_path>` is taken from the response. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling `getFile` again.
     * @param {{file_id: string}} config 
     * @returns {Promise<_File>}
     */
    async getFile(config){
        let params = HTTP("getFile", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        return new _File(response.result);
    }

    /**
     * Use this method to send photos. On success, the sent `Message` is returned.
     * @param {{chat_id: number|string, message_thread_id: number, photo: InputFile|string, caption:string, parse_mode:string, caption_entities: Array<MessageEntity>, show_caption_above_media: boolean, has_spoiler:boolean, disable_notification:boolean, protect_content: boolean, message_effect_id: string, reply_parameters: ReplyParameters, reply_markup:InlineKeyboardMarkup}} config 
     * @returns {Promise<Message>}
     */
    async sendPhoto(config){
        const formdata = new FormData();
        formdata.append('method', 'sendPhoto');
        for (const [key, val] of Object.entries(config)){
        formdata.append(key, val);
        }
        const response = await fetch(this.endpoint, {
            method: "POST",
            body: formdata
        })
        .then(resp => resp.json());
        return new Message(response.result);
    }

    /**
     * Use this method to send video files, Telegram clients support MPEG4 videos (other formats may be sent as `Document`). On success, the sent `Message` is returned. Bots can currently send video files of up to 50 MB in size, this limit may be changed in the future.
     * @param {{chat_id: string|number, message_thread_id: number, video: InputFile|string, duration: number, width: number, height: number, thumbnail: InputFile|string, caption: string, parse_mode: string, caption_entities: Array<MessageEntity>, show_caption_above_media: boolean, has_spoiler: boolean, supports_streaming: boolean, disable_notification: boolean, protect_content: boolean, message_effect_id: string, reply_parameters: ReplyParameters, reply_markup: InlineKeyboardMarkup}} config 
     * @returns {Promise<Message>}
     */
    async sendVideo(config){
        const formdata = new FormData();
        formdata.append('method', 'sendVideo');
        for (const [key, val] of Object.entries(config)){
        formdata.append(key, val);
        }
        const response = await fetch(this.endpoint, {
            method: "POST",
            body: formdata
        })
        .then(resp => resp.json());
        return new Message(response.result);
    }

    /**
     * Use this method to edit text and game messages. On success, if the edited message is not an inline message, the edited `Message` is returned, otherwise `True` is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
     * @param {{chat_id: string|number, message_id: number, inline_message_id: string, text: string, parse_mode: string, entities: Array<MessageEntity>, link_preview_options: LinkPreviewOptions, reply_markup: InlineKeyboardMarkup}} config 
     * @returns {Promise<Message>|Promise<boolean>}
     */
    async editMessageText(config){
        let params = HTTP("editMessageText", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        if (response.result instanceof Boolean){
            return response.result;
        }
        return new Message(response.result);
    }

    /**
     * Use this method to edit animation, audio, document, photo, or video messages. If a message is part of a message album, then it can be edited only to an audio for audio albums, only to a document for document albums and to a photo or a video otherwise. When an inline message is edited, a new file can't be uploaded; use a previously uploaded file via its `file_id` or specify a URL. On success, if the edited message is not an inline message, the edited `Message` is returned, otherwise `True` is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
     * @param {{chat_id: string|number, message_id: number, inline_message_id: string, media: InputMediaAnimation|InputMediaAudio|InputMediaDocument|InputMediaPhoto|InputMediaVideo, reply_markup: InlineKeyboardMarkup}} config 
     * @returns {Promise<Message>|Promise<boolean>}
     */
    async editMessageMedia(config){
        let params = HTTP("editMessageMedia", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        if (response.result instanceof Boolean){
            return response.result;
        }
        return new Message(response.result);
    }

    /**
     * Use this method when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less (when a message arrives from your bot, Telegram clients clear its typing status). Returns `True` on success.
     * @param {{chat_id: number|string, message_thread_id: number, action: string}} config 
     * @returns {Promise<boolean>}
     */
    async sendChatAction(config){
        let params = HTTP("sendChatAction", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        return response.result;
    }

    /**
     * Use this method to send a group of photos, videos, documents or audios as an album. Documents and audio files can be only grouped in an album with messages of the same type. On success, an array of `Messages` that were sent is returned.
     * @param {{chat_id: string|number, message_thread_id: number, media: Array<InputMediaAudio|InputMediaDocument|InputMediaPhoto|InputMediaVideo>, disable_notification: boolean, protect_content: boolean, message_effect_id: string, reply_parameters: ReplyParameters}} config 
     * @returns {Promise<Message>}
     */
    async sendMediaGroup(config){
        const formdata = new FormData();
        formdata.append('method', 'sendMediaGroup');
        for (const [key, val] of Object.entries(config)){
            formdata.append(key, val);
        }
        const response = await fetch(this.endpoint, {
            method: "POST",
            body: formdata
        })
        .then(resp => resp.json());
        return Object.keys(response.result).map(key => {
            return new Message(response.result[key]);
        });
    }

    /**
     * Use this method to send answers to callback queries sent from inline keyboards. The answer will be displayed to the user as a notification at the top of the chat screen or as an alert. On success, `True` is returned.
     * @param {{callback_query_id: string, text: string, show_alert: boolean, url: string, cache_time: number}} config 
     * @returns {Promise<boolean>}
     */
    async answerCallbackQuery(config){
        let params = HTTP("answerCallbackQuery", config);
        const response = await fetch(this.endpoint, params)
        .then(resp => resp.json());
        return response.result;
    }

get args(){
    return this._args;
}

set args(value){
    this._args.push(value);
}

}

/**
 * This object represents an incoming update.
 */
class Update {
/**
 * @constructor
 * @param {Object} update 
 */
constructor(update){
    this.update = update;
    this._update_ids = [];
}

/**
 * @returns {Number} The update's unique identifier. Update identifiers start from a certain positive number and increase sequentially. This identifier becomes especially handy if you're using webhooks, since it allows you to ignore repeated updates or to restore the correct update sequence, should they get out of order. If there are no new updates for at least a week, then identifier of the next update will be chosen randomly instead of sequentially.
 */
get update_id() {return this.update.update_id;}
/**
 * @returns {Message} New incoming message of any kind - text, photo, sticker, etc..
 */
get message() {return this.update.hasOwnProperty("message")? new Message(this.update.message): null;}
/**
 * @returns {Message} New version of a message that is known to the bot and was edited. This update may at times be triggered by changes to message fields that are either unavailable or not actively used by your bot.
 */
get edited_message() {return this.update.hasOwnProperty("edited_message")? new Message(this.update.edited_message): null;}
/**
 * @returns {Message} New incoming channel post of any kind - text, photo, sticker, etc..
 */
get channel_post() {return this.update.hasOwnProperty("channel_post")? new Message(this.update.channel_post): null;}
/**
 * @returns {Message} New version of a channel post that is known to the bot and was edited. This update may at times be triggered by changes to message fields that are either unavailable or not actively used by your bot.
 */
get edited_channel_post() {return this.update.hasOwnProperty("edited_channel_post")? new Message(this.update.edited_channel_post): null;}
/**
 * @returns {CallbackQuery} New incoming callback query.
 */
get callback_query() {return this.update.hasOwnProperty("callback_query")? new CallbackQuery(this.update.callback_query): null;}
/**
 * @returns {Chat} The effective chat the update comes from.
 */
get effective_chat() {
    if(this.update.hasOwnProperty("message")){
        let message = new Message(this.update.message);
        return message.chat;
    }
}
/**
 * @returns {User} The effective user the update comes from.
 */
get effective_user() {
    if(this.update.hasOwnProperty("message")){
        let message = new Message(this.update.message);
        return message.from;
    }
}
/**
 * @returns {Message} The effective message that is sent.
 */
get effective_message() {
    if(this.update.hasOwnProperty("message")){
        let message = new Message(this.update.message);
        return message;
    }
}

/**
 * @returns {Array} A list of the last five update ids.
 * @deprecated This property will be removed in future versions.
 */
get update_ids(){
    return this._update_ids;
}

set update_ids(value){
    this._update_ids.push(value);
    this._update_ids = this._update_ids.slice(1).slice(-5);
}

}

class WebhookInfo {
constructor(webhookinfo){
    this.webhookinfo = webhookinfo;
}

get url() {return this.webhookinfo.url;}
get has_custom_certificate() {return this.webhookinfo.has_custom_certificate;}
get pending_update_count() {return this.webhookinfo.pending_update_count;}
get ip_address() {return this.webhookinfo.hasOwnProperty("ip_address")? this.webhookinfo.ip_address : null;}
get last_error_date() {return this.webhookinfo.hasOwnProperty("last_error_date")? this.webhookinfo.last_error_date : null;}
get last_error_message() {return this.webhookinfo.hasOwnProperty("last_error_message")? this.webhookinfo.last_error_message : null;}
get last_synchronization_error_date() {return this.webhookinfo.hasOwnProperty("last_synchronization_error_date")? this.webhookinfo.last_synchronization_error_date : null;}
get max_connections() {return this.webhookinfo.hasOwnProperty("max_connections")? this.webhookinfo.max_connections : null;}
get allowed_updates() {return this.webhookinfo.hasOwnProperty("allowed_updates")? this.webhookinfo.allowed_updates : null;}
}

class MessageEntity {
constructor(message_entity){
    this.message_entity = message_entity;
}

get type(){return this.message_entity.type;}
get offset(){return this.message_entity.offset;}
get length(){return this.message_entity.length;}
get url(){return this.message_entity.hasOwnProperty('url') ? this.message_entity.url : null;}
get user(){return this.message_entity.hasOwnProperty('user') ? new User(this.message_entity.user) : null;}
get language(){return this.message_entity.hasOwnProperty('language') ? this.message_entity.language : null;}
get custom_emoji_id(){return this.message_entity.hasOwnProperty('custom_emoji_id') ? this.message_entity.custom_emoji_id : null;}
}

/**
 * Describes reply parameters for the message that is being sent.
 */
class ReplyParameters {
    /**
     * @constructor
     * @param {Object} reply_parameters 
     */
    constructor(reply_parameters){
        this.reply_parameters = reply_parameters;
    }

    /**
     * @returns {Number} Identifier of the message that will be replied to in the current chat, or in the chat chat_id if it is specified
     */
    get message_id(){return this.reply_parameters.message_id;}
    /**
     * @returns {Number|String} If the message to be replied to is from a different chat, unique identifier for the chat or username of the channel (in the format @channelusername). Not supported for messages sent on behalf of a business account.
     */
    get chat_id(){return this.reply_parameters.hasOwnProperty("chat_id")?this.reply_parameters.chat_id:null;}
    /**
     * @returns {Boolean} Pass True if the message should be sent even if the specified message to be replied to is not found. Always False for replies in another chat or forum topic. Always True for messages sent on behalf of a business account.
     */
    get allow_sending_without_reply(){return this.reply_parameters.hasOwnProperty("allow_sending_without_reply")?this.reply_parameters.allow_sending_without_reply:null;}
    /**
     * @returns {String} Quoted part of the message to be replied to; 0-1024 characters after entities parsing. The quote must be an exact substring of the message to be replied to, including bold, italic, underline, strikethrough, spoiler, and custom_emoji entities. The message will fail to send if the quote isn't found in the original message.
     */
    get quote(){return this.reply_parameters.hasOwnProperty("quote")?this.reply_parameters.quote:null;}
    /**
     * @returns {String} Mode for parsing entities in the quote. See formatting options for more details.
     */
    get quote_parse_mode(){return this.reply_parameters.hasOwnProperty("quote_parse_mode")?this.reply_parameters.quote_parse_mode:null;}
    /**
     * @returns {Array<MessageEntity>} A JSON-serialized list of special entities that appear in the quote. It can be specified instead of quote_parse_mode.
     */
    get quote_entities(){return this.reply_parameters.hasOwnProperty("quote_entities")?this.reply_parameters.quote_entities.map(entity => new MessageEntity(entity)):null;}
    /**
     * @returns {Number} Position of the quote in the original message in UTF-16 code units.
     */
    get quote_position(){return this.reply_parameters.hasOwnProperty("quote_position")?this.reply_parameters.quote_position:null;}


}

class Chat{
constructor(chat){
    this.chat = chat;
}

get id(){return this.chat.id;}
get type(){return this.chat.type;}
get title(){return this.chat.hasOwnProperty("title")? this.chat.title : null;}
get username(){return this.chat.hasOwnProperty("username")? this.chat.username : null;}
get first_name(){return this.chat.hasOwnProperty("first_name")? this.chat.first_name : null;}
get last_name(){return this.chat.hasOwnProperty("last_name")? this.chat.last_name : null;}
get bio(){return this.chat.hasOwnProperty("bio")? this.chat.bio : null;}
get description(){return this.chat.hasOwnProperty("description")? this.chat.description : null;}
get invite_link(){return this.chat.hasOwnProperty("invite_link")? this.chat.invite_link : null;}

/**
 * 
 * @param {{chat_id: Number|String, text: String, parse_mode: String, link_preview_options: LinkPreviewOptions|{is_disabled: Boolean, url: String, prefer_small_media: Boolean, prefer_large_media: Boolean, show_above_text: Boolean}, disable_notification: Boolean, protect_content: Boolean, message_effect_id: String, reply_parameters: ReplyParameters|Object, reply_markup: InlineKeyboardMarkup|Object}} config 
 * @returns 
 */
async sendMessage(config){
    let params = HTTP("sendMessage", {chat_id: this.id, ...config});
    const response = await fetch(ENDPOINT, params)
                            .then(resp => resp.json());
    return new Message(response.result);
}

async sendPhoto(config){
    const formdata = new FormData();
    formdata.append('method', 'sendPhoto');
    config = {chat_id: this.id, ...config};
    for (const [key, val] of Object.entries(config)){
        formdata.append(key, val);
    }
    const response = await fetch(ENDPOINT, {
        method: "POST",
        body: formdata
    })
    .then(resp => resp.json());
    return new Message(response.result);
}
}

class User{
constructor(user){
    this.user = user;
}

/**
 * @returns {Number} Unique identifier for this user or bot. This number may have more than 32 significant bits and some programming languages may have difficulty/silent defects in interpreting it. But it has at most 52 significant bits, so a 64-bit integer or double-precision float type are safe for storing this identifier.
 */
get id(){return this.user.id;}
/**
 * @returns {Boolean} True, if this user is a bot.
 */
get is_bot(){return this.user.is_bot;}
/**
 * @returns {String} User's or bot's username.
 */
get username(){return this.user.hasOwnProperty("username")? this.user.username : null;}
/**
 * @returns {String} User's or bot's first name.
 */
get first_name(){return this.user.first_name;}
/**
 * @returns {String} User's or bot's last name.
 */
get last_name(){return this.user.hasOwnProperty("last_name")? this.user.last_name : null;}
/**
 * @returns {String} User's or bot's full name.
 */
get full_name(){return this.user.hasOwnProperty("last_name")? `${this.user.first_name} ${this.user.last_name}` : this.user.first_name;}
/**
 * @returns {String} Returns an HTML `<a href>` hyperlink mentioning the user. If no name is passed, it will show their full name.
 */
mention_html(name = null){
    if (name === null){
        let full_name = this.user.hasOwnProperty("last_name")? `${this.user.first_name} ${this.user.last_name}` : this.user.first_name;
        return `<a href="tg://user?id=${this.user.id}">${full_name}</a>`;
    } else {
        return `<a href="tg://user?id=${this.user.id}">${name}</a>`;
    }
}
}

class Document{
constructor(document){
    this.document = document;
}

get file_id(){return this.document.file_id;}
get file_unique_id(){return this.document.file_unique_id;}
get file_size(){return this.document.hasOwnProperty("file_size")? this.document.file_size : null;}
get file_name(){return this.document.hasOwnProperty("file_name")? this.document.file_name : null;}
get mime_type(){return this.document.hasOwnProperty("mime_type")? this.document.mime_type : null;}

}

/**
 * This object represents a file ready to be downloaded. The file can be downloaded via the link `https://api.telegram.org/file/bot<token>/<file_path>`. It is guaranteed that the link will be valid for at least 1 hour. When the link expires, a new one can be requested by calling `getFile`.
 */
class _File{
    constructor(file){
        this.file = file;
    }

    /**
     * Identifier for this file, which can be used to download or reuse the file
     */
    get file_id(){return this.file.file_id;}
    /**
     * Unique identifier for this file, which is supposed to be the same over time and for different bots. Can't be used to download or reuse the file.
     */
    get file_unique_id(){return this.file.file_unique_id;}
    /**
     * File size in bytes. It can be bigger than 2^31 and some programming languages may have difficulty/silent defects in interpreting it. But it has at most 52 significant bits, so a signed 64-bit integer or double-precision float type are safe for storing this value.
     */
    get file_size(){return this.file.hasOwnProperty("file_size")? this.file.file_size : null;}
    /**
     * File path. Use `https://api.telegram.org/file/bot<token>/<file_path>` to get the file.
     */
    get file_path(){return this.file.hasOwnProperty("file_path")? this.file.file_path : null;}

    /**
     * Download the file.
     * @returns {ArrayBuffer}
     */
    async download(){
        const response = await fetch(`https://api.telegram.org/file/bot${API_KEY}/${this.file_path}`)
        .then(resp => resp.arrayBuffer()); // return as a blob
        return response;
    }
}

class PhotoSize {
    constructor(photo_size){
        this.photo_size = photo_size;
    }

    get file_id(){return this.photo_size.file_id;}
    get file_unique_id(){return this.photo_size.file_unique_id;}
    get width(){return this.photo_size.width;}
    get height(){return this.photo_size.height;}
    get file_size(){return this.photo_size.hasOwnProperty('file_size')? this.photo_size.file_size : null;}
}

class Video {
    constructor(video){
        this.video = video;
    }

    get file_id(){return this.video.file_id;}
    get file_unique_id(){return this.video.file_unique_id;}
    get width(){return this.video.width;}
    get height(){return this.video.height;}
    get duration(){return this.video.duration;}
    get thumbnail(){return this.video.hasOwnProperty('thumbnail')? new PhotoSize(this.video.thumbnail) : null;}
    get file_name(){return this.video.hasOwnProperty('file_name')? this.video.file_name : null;}
    get mime_type(){return this.video.hasOwnProperty('mime_type')? this.video.mime_type : null;}
    get file_size(){return this.video.hasOwnProperty('file_size')? this.video.file_size : null;}
}

/**
 * This object describes the origin of a message. It can be one of:
    - `MessageOriginUser`
    - `MessageOriginHiddenUser`
    - `MessageOriginChat`
    - `MessageOriginChannel`
 */
class MessageOrigin {
    constructor(message_origin) {
        const typeToClassMap = {
            "user": MessageOriginUser,
            "hidden_user": MessageOriginHiddenUser,
            "chat": MessageOriginChat,
            "channel": MessageOriginChannel
        };

        const TargetClass = typeToClassMap[message_origin.type];

        if (!TargetClass) {
            throw new Error("Message origin not recognized.");
        }

        const instance = new TargetClass(message_origin);

        return new Proxy(instance, {
            get(target, prop) {
                return prop in target ? target[prop] : undefined;
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        });
    }
}

/**
 * The message was originally sent by a known user.
 */
class MessageOriginUser{
constructor(message_origin){
    this.message_origin = message_origin;
}
/**
 * @returns {String} Type of the message origin, always “user”.
 */
get type(){return this.message_origin.type;}
/**
 * @returns {Number} Date the message was sent originally in Unix time.
 */
get date(){return this.message_origin.date;}
/**
 * @returns {User} User that sent the message originally.
 */
get sender_user(){return new User(this.message_origin.sender_user);}

}

/**
 * The message was originally sent by an unknown user.
 */
class MessageOriginHiddenUser{
constructor(message_origin){
    this.message_origin = message_origin;
}

/**
 * @returns {String} Type of the message origin.
 */
get type(){return this.message_origin.type;}
/**
 * @returns {Number} Date the message was sent originally in Unix time.
 */
get date(){return this.message_origin.date;}
/**
 * @returns {String} User that sent the message originally.
 */
get sender_user_name(){return this.message_origin.sender_user_name;}

}

/**
 * The message was originally sent to a channel chat.
 */
class MessageOriginChat{
constructor(message_origin){
    this.message_origin = message_origin;
}
/**
 * @returns {String} Type of the message origin.
 */
get type(){return this.message_origin.type;}
/**
 * @returns {Number} Date the message was sent originally in Unix time.
 */
get date(){return this.message_origin.date;}
/**
 * @returns {Chat} Channel chat to which the message was originally sent.
 */
get sender_chat(){return new Chat(this.message_origin.sender_chat);}
/**
 * @returns {String} For messages originally sent by an anonymous chat administrator, original message author signature.
 */
get author_signature(){return this.message_origin.hasOwnProperty("author_signature")?this.message_origin.author_signature:null;}
}

class MessageOriginChannel{
constructor(message_origin){
    this.message_origin = message_origin;
}
/**
 * @returns {String} Type of the message origin.
 */
get type(){return this.message_origin.type;}
/**
 * @returns {Number} Date the message was sent originally in Unix time.
 */
get date(){return this.message_origin.date;}
/**
 * @returns {Chat} Channel chat to which the message was originally sent.
 */
get chat(){return new Chat(this.message_origin.chat);}
/**
 * @returns {Number} Unique message identifier inside the chat.
 */
get message_id(){return this.message_origin.message_id;}
/**
 * @returns {String} Signature of the original post author.
 */
get author_signature(){return this.message_origin.hasOwnProperty("author_signature")?this.message_origin.author_signature:null;}
}

/**
 * Describes the options used for link preview generation.
 */
class LinkPreviewOptions {
    /**
     * @constructor
     * @param {{is_disabled: Boolean, url: String, prefer_small_media: Boolean, prefer_large_media: Boolean, show_above_text: Boolean}} linkpreviewoptions 
     */
    constructor(linkpreviewoptions){
        this.linkpreviewoptions = linkpreviewoptions;
    }

    /**
     * @returns {Boolean} `true`, if the link preview is disabled.
     */
    get is_disabled(){return this.linkpreviewoptions.hasOwnProperty("is_disabled")?this.linkpreviewoptions.is_disabled:null;}
    /**
     * @returns {String} URL to use for the link preview. If empty, then the first URL found in the message text will be used.
     */
    get url(){return this.linkpreviewoptions.hasOwnProperty("url")?this.linkpreviewoptions.url:null;}
    /**
     * @returns {Boolean} `true`, if the media in the link preview is supposed to be shrunk; ignored if the URL isn't explicitly specified or media size change isn't supported for the preview.
     */
    get prefer_small_media(){return this.linkpreviewoptions.hasOwnProperty("prefer_small_media")?this.linkpreviewoptions.prefer_small_media:null;}
    /**
     * @returns {Boolean} `true`, if the media in the link preview is supposed to be enlarged; ignored if the URL isn't explicitly specified or media size change isn't supported for the preview.
     */
    get prefer_large_media(){return this.linkpreviewoptions.hasOwnProperty("prefer_large_media")?this.linkpreviewoptions.prefer_large_media:null;}
    /**
     * @returns {Boolean} `true`, if the link preview must be shown above the message text; otherwise, the link preview will be shown below the message text.
     */
    get show_above_text(){return this.linkpreviewoptions.hasOwnProperty("show_above_text")?this.linkpreviewoptions.show_above_text:null;}

    toJSON() {
        return filterObject({
            is_disabled: this.is_disabled,
            url: this.url,
            prefer_small_media: this.prefer_small_media,
            prefer_large_media: this.prefer_large_media,
            show_above_text: this.show_above_text
        });
    }

}

class MaybeInaccessibleMessage {
    constructor(maybeinaccessiblemessage){
        this.maybeinaccessiblemessage = maybeinaccessiblemessage;
        let date = this.maybeinaccessiblemessage.date;
        if (date == 0){
            return new InaccessibleMessage(this.maybeinaccessiblemessage);
        } else {
            return new Message(this.maybeinaccessiblemessage);
        }
    }
}

class InaccessibleMessage{
    constructor(inaccessible_message){
        this.inaccessible_message = inaccessible_message;
    }

    /**
     * @returns {Chat} Chat the message belonged to.
     */
    get chat(){return this.inaccessible_message.chat;}
    /**
     * @returns {Number} Unique message identifier inside the chat.
     */
    get message_id(){return this.inaccessible_message.message_id;}
    /**
     * @returns {Number} Always 0.
     */
    get date(){return this.inaccessible_message.date;}
}

class Message{
constructor(message){
    this.message = message;
}

/**
 * @returns {Number} Unique message identifier inside this chat.
 */
get message_id(){return this.message.message_id;}
/**
 * @returns {User} Sender of the message; empty for messages sent to channels. For backward compatibility, the field contains a fake sender user in non-channel chats, if the message was sent on behalf of a chat.
 */
get from(){return this.message.hasOwnProperty("from")? new User(this.message.from) : null;}
/**
 * @returns {Number} Date the message was sent in Unix time. It is always a positive number, representing a valid date.
 */
get date(){return this.message.date;}
/**
 * @returns {Chat} Chat the message belongs to.
 */
get chat(){return new Chat(this.message.chat);}
/**
 * @returns {String} For text messages, the actual UTF-8 text of the message.
 */
get text(){return this.message.hasOwnProperty("text")? this.message.text : null;}
/**
 * @returns {MessageOrigin}  Information about the original message for forwarded messages.
 */
get forward_origin(){return this.message.hasOwnProperty("forward_origin")? new MessageOrigin(this.message.forward_origin) : null;}
/**
 * @returns {Chat} The chat the message was forwarded from.
 */
get forward_from_chat(){return this.message.hasOwnProperty("forward_from_chat")? new Chat(this.message.forward_from_chat) : null;}
/**
 * @returns {Document} The attached document.
 */
get document(){return this.message.hasOwnProperty("document")? new Document(this.message.document) : null;}
/**
 * @returns {MessageEntity[]} A list of MessageEntity representing all the entities in the message.
 */
get entities(){return this.message.hasOwnProperty('entities')? this.message.entities.map(entity => new MessageEntity(entity)) : null;}
/**
 * @returns {String} The caption of the message.
 */
get caption(){return this.message.hasOwnProperty('caption')? this.message.caption : null;}
/**
 * @returns {Array<PhotoSize>} A list of `PhotoSize` representing the attached photos.
 */
get photo(){return this.message.hasOwnProperty('photo') ? this.message.photo.map(pic => new PhotoSize(pic)) : null;}
/**
 * @returns {Video} The attached video.
 */
get video(){return this.message.hasOwnProperty('video')? new Video(this.message.video) : null;}
/**
 * @returns {String} The unique identifier of a media message group this message belongs to.
 */
get media_group_id(){return this.message.hasOwnProperty("media_group_id")?this.message.media_group_id:null;}
/**
 * @returns {InlineKeyboardMarkup} Inline keyboard attached to the message. login_url buttons are represented as ordinary url buttons.
 */
get reply_markup(){return this.message.hasOwnProperty('reply_markup') ? new InlineKeyboardMarkup(this.message.reply_markup.map(row => row.map(col => new InlineKeyboardButton(col)))) : null;}
/**
 * @returns {String} Unique identifier of the message effect added to the message.
 */
get effect_id(){return this.message.hasOwnProperty("effect_id")? this.message.effect_id : null;}
/**
 * @returns {LinkPreviewOptions} Options used for link preview generation for the message, if it is a text message and link preview options were changed.
 */
get link_preview_options(){return this.message.hasOwnProperty("link_preview_options")? new LinkPreviewOptions(this.message.link_preview_options):null;}
}

class InlineKeyboardButton {
    constructor(config){
        this.config = config;
    }

    get text(){return this.config.text;}
    get url(){return this.config.hasOwnProperty('url') ? this.config.url : null;}
    get callback_data(){return this.config.hasOwnProperty('callback_data') ? this.config.callback_data : null;}

    toJSON(){
        return filterObject({
            text: this.text,
            url: this.url,
            callback_data: this.callback_data
        });
    }
}

class InlineKeyboardMarkup {
    /**
     * @constructor
     * @param {InlineKeyboardButton[][]} inline_keyboard 
     */
    constructor(inline_keyboard){
        this.inline_keyboard = inline_keyboard;
    }

    toJSON(){
        let markup = {inline_keyboard: []};

        for (let row = 0; row < this.inline_keyboard.length; row++){
            var buttonsRow = [];
            for (let col = 0; col < this.inline_keyboard[row].length; col++){
                var button = this.inline_keyboard[row][col];
                buttonsRow.push(button);
            }
            markup.inline_keyboard.push(buttonsRow);
        }

        return markup;
    }

    // get keyboard(){
    //     var _keyboard = {};
    //     var buttons = [];
        
    //     for (let row = 0; row < this.inline_keyboard.length; row++){
    //         var btn = [];
    //         for (let col = 0; col < this.inline_keyboard[row].length; col++){
    //             var curr_btn = this.inline_keyboard[row][col].config;
    //             btn.push(curr_btn);
    //         }
    //         buttons.push(btn);
    //     }

    //     _keyboard = {
    //         inline_keyboard : buttons
    //     };

    //     return _keyboard;
    // }
}

class CallbackQuery {
    constructor(query){
        this.query = query;
    }

    /**
     * @returns {String} Unique identifier for this query.
     */
    get id(){return this.query.id;}
    /**
     * @returns {User} Sender.
     */
    get from(){return new User(this.query.from);}
    /**
     * @returns {MaybeInaccessibleMessage} Message sent by the bot with the callback button that originated the query.
     */
    get message(){return this.query.hasOwnProperty('message') ? new MaybeInaccessibleMessage(this.query.message) : null;}
    /**
     * @returns {String} Identifier of the message sent via the bot in inline mode, that originated the query.
     */
    get inline_message_id(){return this.query.hasOwnProperty('inline_message_id') ? this.query.inline_message_id : null;}
    /**
     * @returns {String} Global identifier, uniquely corresponding to the chat to which the message with the callback button was sent. Useful for high scores in games.
     */
    get chat_instance(){return this.query.chat_instance;}
    /**
     * @returns {String} Data associated with the callback button. Be aware that the message originated the query can contain no callback buttons with this data.
     */
    get data(){return this.query.hasOwnProperty('data') ? this.query.data : null;}
    /**
     * @returns {String} Short name of a Game to be returned, serves as the unique identifier for the game.
     */
    get game_short_name(){return this.query.hasOwnProperty('game_short_name') ? this.query.game_short_name : null;}

    /**
     * After the user presses a callback button, Telegram clients will display a progress bar until you call answerCallbackQuery. It is, therefore, necessary to react by calling answerCallbackQuery even if no notification to the user is needed (e.g., without specifying any of the optional parameters).
     * @param {Object} config 
     * @returns {Boolean}
     */
    async answer(config = {}){
        config = {id: this.query.id, ...config};
        let params = HTTP("answerCallbackQuery", config);
        const response = await fetch(ENDPOINT, params)
        .then(resp => resp.json());
        console.log(response);
        return response.result;
    }
}

export {
    App,
    Bot,
    Update,
    Chat,
    Message,
    User,
    Document,
    _File,
    PhotoSize,
    Video,
    MessageEntity,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    CallbackQuery,
    CommandHandler,
    ConversationHandler,
    CallbackQueryHandler,
    LinkPreviewOptions,
    MessageHandler,
    Filters,
    MessageEffect,
    ParseMode,
    ChatAction
}
