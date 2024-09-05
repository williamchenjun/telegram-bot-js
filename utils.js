/* Functions that are not inherently part of Telegram bots. These are used for convenience. */

function sleep(seconds) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, seconds * 1000);
    });
}

function filterObject(obj){
    return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => value !== null && value !== undefined)
    );
}

async function Alert(msg){
    return await fetch(`https://api.telegram.org/bot${API_KEY}/sendMessage?chat_id=162243596&text=${msg}`);
}

function getIndex(array, key, value){
    for (let i = 0; i < array.length; i++){
        if (array[i][key].toLowerCase() == value.toLowerCase()){
            return i;
        }
    }
    return null;
}

function Partition(array, size){
    var partitions = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        partitions.push(chunk);
    }
    return partitions;
}

async function waitForUpdate(update_ids){
    let previous_id = update_ids.at(-1);
    let last_id = update_ids.length >= 2 ? update_ids.at(-2) : undefined;
    let timer;

    return new Promise((resolve) => {
        async function check(){
            last_id = update_ids.at(-1);
            previous_id = update_ids.at(-2);

            if (last_id && last_id === previous_id) {
                timer = setTimeout(check, 500);
            } else {
                if (timer) {
                    clearTimeout(timer);
                }
                resolve();
            }
        }

        check();
    });
}


function HTTP(method, params, type = null){
    if (type == null){
        type = "application/json; charset=UTF-8";
    }
    return {
        method: "POST",
        headers: {
        "Content-Type": type,
        },
        body: JSON.stringify({
        method: method, 
        ...params
        })
    };
}

function MDLinkExtract(string){
    const singleReg = /\[([^\[]+)\]\((.*)\)/;
    var links = []
    var result = [];
    
    var caption = string.split('\n')[0];
    var caption_match = singleReg.exec(caption);

    if (caption_match == null){
        caption = null;
    } else {
        caption = caption_match;
        caption = caption[1].toLowerCase() == "caption" ? caption_match[2] : null;
        caption = caption != null ? caption.replace('\\', '\n') : null;
    }
    
    var rows = string.split('\n');
    for (const row of rows.slice(caption != null? 1 : 0)){
        links.push(row.split(' | '));
    }

    for (let row = 0; row < links.length; row++){
        var temp = []
        for (let col = 0; col < links[row].length; col++){
            const [full, text, url] = singleReg.exec(links[row][col]);
            temp.push({text: text, url: url});
        }
        result.push(temp);
    }
    return {caption: caption, links: result};
}

class Objecty {
    /**
     * @constructor
     * @param {Object} obj 
     */
    constructor(obj){
        this._obj = obj;
        return new Proxy(this, {
            get(target, prop) {
                if (prop in target) {
                    return target[prop];
                }
                return target._obj[prop];
            },
            set(target, prop, value) {
                if (prop in target) {
                    target[prop] = value;
                    return true;
                }
                target._obj[prop] = value;
                return true;
            },
            deleteProperty(target, prop) {
                if (prop in target) {
                    delete target[prop];
                    return true;
                }
                delete target._obj[prop];
                return true;
            }
        });
    }

    /**
     * Get an object value by its key.
     * @param {any} key 
     */
    get(key) {
        return this._obj[key];
    }

    /**
     * Add or update a key-value pair in the object.
     * @param {any} key 
     * @param {any} value
     */
    update(obj){
        return {...this._obj, ...obj};
    }

    /**
     * Remove a key-value pair by its key.
     * @param {any} key 
     */
    remove(key){
        delete this._obj[key];
        return this;
    }

    toJSON(){
        return this._obj;
    }
}

export {
    sleep,
    Alert,
    Partition,
    HTTP,
    MDLinkExtract,
    getIndex,
    waitForUpdate,
    filterObject,
    Objecty
}