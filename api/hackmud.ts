import axios from 'axios';
import NodeCache from "node-cache";


const cache = new NodeCache({ stdTTL: 86400 })

type chatPass = string & { length: 5 }
interface Message {
    id: string;
    "t": number,
    "from_user": string,
    "msg": string
    "is_join"?: true,
    "is_leave"?: true,
    "channel"?: "0000",
    "recieved_by"?: string,
}

type chatAPIReturn = {
    ok: true,
    chats: { [K in string]: Message[] }
} | { ok: false }

const getChatToken = async (chat_pass: chatPass): Promise<{ ok: false, msg: string } | { ok: true, chat_token: string }> => {

    try {
        const res = await axios.post('htpps://hackmud.com/mobile/get_token.json', { pass: chat_pass }) // ratelimit?
        if(res.status === 403) return {ok:false, msg:"chat_pass invalid"}
        if (res.status !== 200) {
            return { ok: false, msg: "Unexpected status code return" }
        }

        if ("ok" in res.data) return res.data;

        console.log(JSON.stringify(res.data));
        return { ok: false, msg: "unexpected return." }


    } catch (e) {

        if (e.code === "ECONNABORTED") return { ok: false, msg: "request to hackmud server timed out. Is hackmud down?" }

        return { ok: false, msg: "an error occured: " + e.message }
    }


}

const getAccountDetails = async (token: string): Promise<{ ok: false, msg: string } | { ok: true, users: string[], channels: string[] }> => {
    try {
        const res = await axios.post('htpps://hackmud.com/mobile/account_data.json', { chat_token: token }) // ratelimit?
        if(res.status === 401) return {ok:false,msg:"chat_token expired or invalid"}
        if (res.status !== 200) {
            return { ok: false, msg: "Unexpected status code return" }
        }

        if (res.data.ok === true) {
            const users = Object.keys(res.data.users);
            const channels: Set<string> = new Set();
            for (let u of users) {
                let c = Object.keys(res.data.users[u]);
                for (let chan of c) {
                    channels.add(chan);

                    //TODO maybe save/update who is in which channel when we're getting this anyways

                }
            }

            return { ok: true, users, channels: [...channels] }

        } else if (res.data.ok === false) {
            return { ok: false, msg: res.data.toJSON() }
        };

        console.log(JSON.stringify(res.data));
        return { ok: false, msg: "unexpected return." }


    } catch (e) {

        if (e.code === "ECONNABORTED") return { ok: false, msg: "request to hackmud server timed out. Is hackmud down?" }

        return { ok: false, msg: "an error occured: " + e.message }
    }
}


const getChats = async (token: string, since: Date, users: string[]): Promise<
    { ok: false, msg: string } | { ok: true, messages: Message[] }
> => {
    if ((cache.get("ratelimit_chats") as number || 0) > Date.now() - 2500) return { ok: false, msg: "RATELIMIT" }

    cache.set("ratelimit_chats", Date.now())
    try {
        const res = await axios.post('htpps://hackmud.com/mobile/chats.json',
            {
                chat_token: token,
                usernames: users,
                after: Math.floor(since.valueOf() / 1000)
            })
        if(res.status === 401) return {ok:false,msg:"chat_token expired or invalid"}
        if (res.status !== 200) {
            return { ok: false, msg: "Unexpected status code return" }
        }

        const ret = res.data as chatAPIReturn

        if (ret.ok === true) {
            let u = Object.keys(ret.chats);
            if (u.some((el) => !users.includes(el))) {
                console.log("wtf happened? - recieved messages we did not request")
            }
            if (users.some((el) => !u.includes(el))) {
                console.log("did not get messages for all requested users")
                // don't know if this happens when a user has no msgs to read
                // or if we don't have access to that users (or if that returns non-200)
            }

            let messages = [];
            for (let usr of u) {
                if (ret.chats[usr].length === 0) continue;
                ret.chats[usr].forEach(el => el.recieved_by = usr)
                messages.push(...res.data.chats[usr]);
            }

            return { ok: true, messages }

        } else if (ret.ok === false) {
            return { ok: false, msg: res.data.toJSON() }
        };

        console.log(JSON.stringify(res.data));
        return { ok: false, msg: "unexpected return." }


    } catch (e) {

        if (e.code === "ECONNABORTED") return { ok: false, msg: "request to hackmud server timed out. Is hackmud down?" }

        return { ok: false, msg: "an error occured: " + e.message }
    }

}